// NOTE: Outlook integration is OPTIONAL! 
// The extension works without these credentials for manual time tracking.
// Only set up if you want automatic meeting import from Outlook.
const CLIENT_ID = '46098b7a-b45a-4467-ba2b-3c0d509e5a61'; // Replace with your Azure app client ID
const REDIRECT_URL = chrome.identity.getRedirectURL();
const SCOPES = ['User.Read', 'Calendars.Read'];

// OAuth functions
async function getAuthToken() {
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
        chrome.storage.local.set({ accessToken: token }, () => {
          resolve(token);
        });
      } else {
        reject(new Error('No access token received'));
      }
    });
  });
}

// Fetch calendar events
async function fetchCalendarEvents(startDate, endDate) {
  const token = await getStoredToken();
  if (!token) throw new Error('No auth token');

  const start = startDate.toISOString();
  const end = endDate.toISOString();
  
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarview?startdatetime=${start}&enddatetime=${end}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch calendar events');
  }

  const data = await response.json();
  return data.value;
}

// Get stored token
async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get('accessToken', (result) => {
      resolve(result.accessToken);
    });
  });
}

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'authenticate') {
    getAuthToken()
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
    chrome.storage.local.remove('accessToken', () => {
      sendResponse({ success: true });
    });
    return true;
  }
});