// NOTE: Outlook integration is OPTIONAL! 
// The extension works without these credentials for manual time tracking.
// Only set up if you want automatic meeting import from Outlook.
let CLIENT_ID = 'YOUR_AZURE_APP_CLIENT_ID'; // Default, will be overridden by stored value

// Load client ID from storage
chrome.storage.local.get(['clientId'], (result) => {
  if (result.clientId) {
    CLIENT_ID = result.clientId;
  }
});

const REDIRECT_URL = chrome.identity.getRedirectURL();
const SCOPES = ['User.Read', 'Calendars.Read'];

// OAuth functions with token validation
async function getAuthToken(forceNew = false) {
  // Check if we have a valid token first
  if (!forceNew) {
    const existingToken = await getStoredToken();
    if (existingToken) {
      // Validate token by making a test request
      const isValid = await validateToken(existingToken);
      if (isValid) {
        return existingToken;
      }
    }
  }
  
  return new Promise((resolve, reject) => {
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${CLIENT_ID}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URL)}` +
      `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
      `&response_mode=fragment`;

    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        reject(new Error('Authorization failed'));
        return;
      }

      const url = new URL(redirectUrl);
      const params = new URLSearchParams(url.hash.substring(1));
      const token = params.get('access_token');
      
      if (token) {
        chrome.storage.local.set({ 
          accessToken: token,
          tokenTimestamp: Date.now() 
        }, () => {
          resolve(token);
        });
      } else {
        reject(new Error('No access token received'));
      }
    });
  });
}

// Validate token by making a test request
async function validateToken(token) {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Fetch calendar events with better error handling
async function fetchCalendarEvents(startDate, endDate) {
  let token = await getStoredToken();
  
  if (!token) {
    throw new Error('No auth token');
  }
  
  const start = startDate.toISOString();
  const end = endDate.toISOString();
  
  let response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarview?startdatetime=${start}&enddatetime=${end}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // If unauthorized, try to refresh token
  if (response.status === 401) {
    token = await getAuthToken(true); // Force new token
    response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarview?startdatetime=${start}&enddatetime=${end}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  if (!response.ok) {
    throw new Error('Failed to fetch calendar events');
  }

  const data = await response.json();
  return data.value;
}

// Get stored token
async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessToken', 'tokenTimestamp'], (result) => {
      // Check if token is older than 1 hour (tokens typically expire after 1 hour)
      if (result.accessToken && result.tokenTimestamp) {
        const tokenAge = Date.now() - result.tokenTimestamp;
        if (tokenAge > 55 * 60 * 1000) { // 55 minutes
          // Token is likely expired
          resolve(null);
        } else {
          resolve(result.accessToken);
        }
      } else {
        resolve(null);
      }
    });
  });
}

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateClientId') {
    CLIENT_ID = request.clientId;
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'authenticate') {
    getAuthToken(true) // Force new token for authenticate
      .then(token => sendResponse({ success: true, token }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'fetchEvents') {
    fetchCalendarEvents(new Date(request.startDate), new Date(request.endDate))
      .then(events => sendResponse({ success: true, events }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'logout') {
    chrome.storage.local.remove(['accessToken', 'tokenTimestamp'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});