// background.js - Service Worker for Time Tracker Extension
// Handles Outlook authentication and calendar sync with PKCE support
// Google Calendar is handled through chrome.identity API directly

// Store for OAuth tokens
let accessToken = null;
let tokenExpiry = null;

// Store PKCE verifier for token exchange
let codeVerifier = null;

// Azure AD OAuth configuration
// You need to register an app in Azure Portal and get these values
const CLIENT_ID = ''; // Add your Azure App Client ID here
const REDIRECT_URI = chrome.identity.getRedirectURL();
const TENANT = 'common'; // Use 'common' for multi-tenant
const SCOPE = 'User.Read Calendars.Read offline_access';

// OAuth URLs
const AUTH_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;

// Log the redirect URI for debugging
console.log('Chrome Extension Redirect URI:', REDIRECT_URI);
console.log('Copy this URI to your Azure App Registration!');

// PKCE Helper Functions
function generateRandomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const random = new Uint8Array(length);
  crypto.getRandomValues(random);
  return Array.from(random)
    .map(x => charset[x % charset.length])
    .join('');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return hash;
}

function base64UrlEncode(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generatePKCEChallenge() {
  // Generate code verifier (43-128 characters)
  const verifier = generateRandomString(128);
  
  // Generate code challenge (SHA256 hash of verifier)
  const hashed = await sha256(verifier);
  const challenge = base64UrlEncode(hashed);
  
  return { verifier, challenge };
}

// Message handler for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  if (request.action === 'authenticate') {
    handleAuthentication().then(sendResponse).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  } else if (request.action === 'fetchEvents') {
    fetchCalendarEvents(request.startDate, request.endDate)
      .then(events => sendResponse({ success: true, events }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'getToken') {
    getValidToken()
      .then(token => sendResponse({ success: true, token }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'signOut') {
    chrome.storage.local.remove(['accessToken', 'refreshToken', 'tokenExpiry', 'userEmail'], () => {
      accessToken = null;
      tokenExpiry = null;
      codeVerifier = null;
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'getRedirectUri') {
    // Return the redirect URI for display in options
    sendResponse({ redirectUri: REDIRECT_URI });
    return true;
  } else if (request.action === 'restartAutoTracking') {
    // Notify popup to restart auto-tracking check
    console.log('Auto-tracking restart requested');
    sendResponse({ success: true });
    return true;
  }
});
// Listen for custom models updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'customModelsUpdated') {
    // Notify all tabs and popups about the update
    chrome.runtime.sendMessage({ action: 'reloadCustomModels' });
    
    // Also notify all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'reloadCustomModels' }).catch(() => {
          // Ignore errors for tabs that don't have content scripts
        });
      });
    });
  }
  
  
  return true; // Keep the message channel open for async responses
});
// Handle OAuth authentication with PKCE
async function handleAuthentication() {
  try {
    // Initialize stored variable in outer scope
    let storedClientId = CLIENT_ID;
    
    // Get the client ID from storage if not set in const
    if (!CLIENT_ID) {
      const stored = await chrome.storage.local.get(['clientId']);
      if (!stored.clientId) {
        throw new Error('Please set your Azure App Client ID in the extension options');
      }
      storedClientId = stored.clientId;
    }
    
    // Generate PKCE challenge
    const pkce = await generatePKCEChallenge();
    codeVerifier = pkce.verifier; // Store for later use in token exchange
    
    console.log('Starting OAuth flow with PKCE:');
    console.log('Client ID:', storedClientId);
    console.log('Redirect URI:', REDIRECT_URI);
    console.log('Code Challenge Method: S256');
    
    // Build authorization URL with PKCE parameters
    const authParams = new URLSearchParams({
      client_id: storedClientId,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPE,
      response_mode: 'query',
      prompt: 'select_account',
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256'
    });
    
    const authUrl = `${AUTH_URL}?${authParams}`;
    console.log('Auth URL (with PKCE):', authUrl);
    
    // Launch OAuth flow
    let responseUrl;
    try {
      responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      });
      console.log('OAuth response URL:', responseUrl);
    } catch (flowError) {
      console.error('OAuth flow error:', flowError);
      if (flowError.message.includes('User interaction required')) {
        throw new Error('Authentication was cancelled');
      }
      throw flowError;
    }
    
    // Parse the response URL
    const url = new URL(responseUrl);
    
    // Check for error in response
    const error = url.searchParams.get('error');
    if (error) {
      const errorDescription = url.searchParams.get('error_description') || 'Unknown error';
      console.error('OAuth error:', error, errorDescription);
      
      // Provide helpful error messages
      if (error === 'invalid_request') {
        if (errorDescription.includes('PKCE')) {
          throw new Error('PKCE configuration error. Please check Azure app settings.');
        }
        throw new Error(`Authentication failed: ${errorDescription}`);
      } else if (error === 'unauthorized_client') {
        throw new Error('The app is not authorized. Please check Azure app permissions.');
      } else if (error === 'access_denied') {
        throw new Error('Access was denied. Please grant the necessary permissions.');
      } else {
        throw new Error(`Authentication failed: ${errorDescription}`);
      }
    }
    
    // Extract authorization code from response
    const code = url.searchParams.get('code');
    
    if (!code) {
      console.error('No code in response. URL parameters:', Array.from(url.searchParams.entries()));
      throw new Error('No authorization code received. Please ensure the redirect URI in Azure exactly matches: ' + REDIRECT_URI);
    }
    
    console.log('Authorization code received, exchanging for token with PKCE verifier...');
    
    // Exchange code for access token (with PKCE verifier)
    const tokenResponse = await exchangeCodeForToken(code, storedClientId, codeVerifier);
    
    // Clear the verifier after use
    codeVerifier = null;
    
    // Store tokens
    await storeTokens(tokenResponse);
    
    // Get user info
    const userInfo = await getUserInfo(tokenResponse.access_token);
    
    console.log('Authentication successful for user:', userInfo.mail || userInfo.userPrincipalName);
    
    return { 
      success: true, 
      userEmail: userInfo.mail || userInfo.userPrincipalName 
    };
  } catch (error) {
    console.error('Authentication error:', error);
    codeVerifier = null; // Clear on error
    throw error;
  }
}

// Exchange authorization code for access token with PKCE
async function exchangeCodeForToken(code, clientId, verifier) {
  // Use provided clientId or get from storage
  const effectiveClientId = clientId || CLIENT_ID || (await chrome.storage.local.get(['clientId'])).clientId;
  
  const tokenParams = new URLSearchParams({
    client_id: effectiveClientId,
    code: code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    code_verifier: verifier, // Include PKCE verifier
    scope: SCOPE
  });
  
  console.log('Token exchange parameters (with PKCE):');
  console.log({
    client_id: effectiveClientId,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    code_verifier_length: verifier ? verifier.length : 0
  });
  
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: tokenParams
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange failed:', errorText);
    
    // Try to parse error as JSON
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error === 'invalid_grant') {
        if (errorJson.error_description && errorJson.error_description.includes('PKCE')) {
          throw new Error('PKCE verification failed. This might be a code verifier mismatch.');
        }
        throw new Error('Invalid authorization code. This might be due to redirect URI mismatch or expired code.');
      }
      throw new Error(`Token exchange failed: ${errorJson.error_description || errorJson.error}`);
    } catch (e) {
      throw new Error(`Token exchange failed: ${errorText}`);
    }
  }
  
  const tokenData = await response.json();
  console.log('Token received successfully');
  return tokenData;
}

// Store tokens in Chrome storage
async function storeTokens(tokenResponse) {
  const expiryTime = new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000);
  
  await chrome.storage.local.set({
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    tokenExpiry: expiryTime.toISOString()
  });
  
  accessToken = tokenResponse.access_token;
  tokenExpiry = expiryTime;
}

// Get user information from Microsoft Graph
async function getUserInfo(token) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to get user info:', errorText);
    throw new Error('Failed to get user info from Microsoft Graph');
  }
  
  const userInfo = await response.json();
  
  // Store user email
  await chrome.storage.local.set({
    userEmail: userInfo.mail || userInfo.userPrincipalName
  });
  
  return userInfo;
}

// Get valid access token (refresh if needed)
async function getValidToken() {
  // Check if we have a token in memory
  if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
    return accessToken;
  }
  
  // Check storage for token
  const stored = await chrome.storage.local.get(['accessToken', 'tokenExpiry', 'refreshToken']);
  
  if (stored.accessToken && stored.tokenExpiry) {
    const expiry = new Date(stored.tokenExpiry);
    
    if (new Date() < expiry) {
      accessToken = stored.accessToken;
      tokenExpiry = expiry;
      return accessToken;
    }
  }
  
  // Try to refresh token if we have a refresh token
  if (stored.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(stored.refreshToken);
      await storeTokens(refreshed);
      return refreshed.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Authentication required. Please reconnect to Outlook.');
    }
  }
  
  throw new Error('No valid authentication. Please connect to Outlook.');
}

// Refresh access token (Note: PKCE not required for refresh)
async function refreshAccessToken(refreshToken) {
  // Get client ID from storage if needed
  const storedData = await chrome.storage.local.get(['clientId']);
  const effectiveClientId = CLIENT_ID || storedData.clientId;
  
  if (!effectiveClientId) {
    throw new Error('No Client ID configured. Please set it in extension options.');
  }
  
  const tokenParams = new URLSearchParams({
    client_id: effectiveClientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: SCOPE
  });
  
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: tokenParams
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token refresh failed:', errorText);
    throw new Error('Token refresh failed. Please reconnect.');
  }
  
  return response.json();
}

// Fetch calendar events from Microsoft Graph
async function fetchCalendarEvents(startDate, endDate) {
  try {
    const token = await getValidToken();
    
    // Build Graph API URL for calendar events
    const url = new URL('https://graph.microsoft.com/v1.0/me/calendarview');
    url.searchParams.append('startDateTime', startDate);
    url.searchParams.append('endDateTime', endDate);
    url.searchParams.append('$select', 'subject,start,end,isAllDay,location,organizer,attendees,id,webLink');
    url.searchParams.append('$orderby', 'start/dateTime');
    url.searchParams.append('$top', '50');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, clear storage
        await chrome.storage.local.remove(['accessToken', 'tokenExpiry']);
        throw new Error('Authentication expired. Please reconnect to Outlook.');
      }
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

// Listen for alarm events (can be used for reminders)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshToken') {
    // Refresh token periodically
    chrome.storage.local.get(['refreshToken'], async (result) => {
      if (result.refreshToken) {
        try {
          const refreshed = await refreshAccessToken(result.refreshToken);
          await storeTokens(refreshed);
        } catch (error) {
          console.error('Periodic token refresh failed:', error);
        }
      }
    });
  }
});

// Set up periodic token refresh (every 30 minutes)
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refreshToken', { periodInMinutes: 30 });
  
  // Log the redirect URI on installation
  console.log('Extension installed. Redirect URI for Azure:', REDIRECT_URI);
  console.log('PKCE is enabled for enhanced security');
  console.log('Google Calendar uses chrome.identity API directly');
});

// Export for testing (only in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleAuthentication,
    fetchCalendarEvents,
    getValidToken
  };
}