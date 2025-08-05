// google-calendar.js - Google Calendar Integration Service
class GoogleCalendarService {
    constructor() {
      this.baseUrl = 'https://www.googleapis.com/calendar/v3';
      this.tokenCache = null;
      this.tokenExpiry = null;
    }
  
    // Get auth token with caching
    async getAuthToken(interactive = true) {
      // Check cache first
      if (this.tokenCache && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.tokenCache;
      }
  
      return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (token) {
            // Cache token for 50 minutes (tokens last 60 minutes)
            this.tokenCache = token;
            this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);
            resolve(token);
          } else {
            reject(new Error('No token received'));
          }
        });
      });
    }
  
    // Check if user is connected
    async isConnected() {
      try {
        await this.getAuthToken(false); // non-interactive
        return true;
      } catch {
        return false;
      }
    }
  
    // Get user info
    async getUserInfo() {
      try {
        const token = await this.getAuthToken(false);
        const response = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        
        if (!response.ok) throw new Error('Failed to get user info');
        const data = await response.json();
        
        return {
          email: data.email,
          name: data.name,
          picture: data.picture
        };
      } catch (error) {
        console.error('Error getting user info:', error);
        throw error;
      }
    }
  
    // Fetch calendar events
    async fetchEvents(startDate, endDate) {
      try {
        const token = await this.getAuthToken(false);
        
        // Get all calendars first to support multiple calendars
        const calendarsResponse = await fetch(
          `${this.baseUrl}/users/me/calendarList?` + new URLSearchParams({
            minAccessRole: 'reader',
            showHidden: false
          }),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
  
        if (!calendarsResponse.ok) throw new Error('Failed to fetch calendars');
        const calendarsData = await calendarsResponse.json();
        
        // Fetch events from primary calendar (can be extended to fetch from all)
        const primaryCalendar = calendarsData.items.find(cal => cal.primary) || calendarsData.items[0];
        
        if (!primaryCalendar) {
          throw new Error('No calendar found');
        }
        
        const params = new URLSearchParams({
          timeMin: startDate,
          timeMax: endDate,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: '50'
        });
  
        const response = await fetch(
          `${this.baseUrl}/calendars/${encodeURIComponent(primaryCalendar.id)}/events?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Failed to fetch events');
        }
        
        const data = await response.json();
        return this.normalizeEvents(data.items || []);
      } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        throw error;
      }
    }
  
    // Normalize Google events to match Microsoft format
    normalizeEvents(googleEvents) {
      return googleEvents
        .filter(event => event.status !== 'cancelled') // Exclude cancelled events
        .map(event => ({
          id: `google_${event.id}`,
          subject: event.summary || 'No title',
          start: {
            dateTime: event.start.dateTime || event.start.date,
            timeZone: event.start.timeZone || 'UTC'
          },
          end: {
            dateTime: event.end.dateTime || event.end.date,
            timeZone: event.end.timeZone || 'UTC'
          },
          isAllDay: !event.start.dateTime,
          location: event.location || '',
          description: event.description || '',
          organizer: {
            emailAddress: {
              address: event.organizer?.email || '',
              name: event.organizer?.displayName || event.organizer?.email || ''
            }
          },
          attendees: (event.attendees || []).map(attendee => ({
            emailAddress: {
              address: attendee.email,
              name: attendee.displayName || attendee.email
            },
            type: attendee.organizer ? 'required' : (attendee.optional ? 'optional' : 'required'),
            responseStatus: attendee.responseStatus || 'none'
          })),
          provider: 'google',
          htmlLink: event.htmlLink, // Link to open in Google Calendar
          // Color coding for different event types
          colorId: event.colorId,
          // Determine if user is organizer
          isOrganizer: event.organizer?.self === true,
          // Meeting status
          status: event.status,
          // Recurrence info
          recurringEventId: event.recurringEventId,
          // Transparency (free/busy)
          transparency: event.transparency || 'opaque'
        }));
    }
  
    // Sign out
    async signOut() {
      try {
        // Clear token cache
        this.tokenCache = null;
        this.tokenExpiry = null;
        
        // Get current token to revoke it
        const token = await this.getAuthToken(false);
        
        // Revoke the token
        await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`, {
          method: 'POST'
        });
        
        // Clear Chrome's token cache
        return new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({ token }, () => {
            chrome.identity.clearAllCachedAuthTokens(() => {
              resolve();
            });
          });
        });
      } catch (error) {
        console.error('Error signing out:', error);
        // Even if revoke fails, clear local state
        return new Promise((resolve) => {
          chrome.identity.clearAllCachedAuthTokens(() => {
            resolve();
          });
        });
      }
    }
  
    // Connect account (trigger auth flow)
    async connect() {
      try {
        const token = await this.getAuthToken(true); // interactive
        const userInfo = await this.getUserInfo();
        
        // Save connection info
        chrome.storage.local.set({
          googleConnected: true,
          googleEmail: userInfo.email,
          googleName: userInfo.name
        });
        
        return userInfo;
      } catch (error) {
        console.error('Failed to connect Google account:', error);
        throw error;
      }
    }
  }