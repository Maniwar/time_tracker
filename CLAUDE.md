# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Chrome Extension** for time tracking with advanced features including AI-powered reports, calendar integration, and multi-tasking support. The project uses **vanilla JavaScript** (no build process required) and follows Chrome Extension Manifest V3 specifications.

## Development Commands

### Installation & Testing
```bash
# No build process - load directly into Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select the project directory
# 4. The extension will be loaded and ready for testing
```

### Testing the Extension
- **Reload Extension**: Go to chrome://extensions/ and click the refresh icon
- **Debug Popup**: Right-click extension icon → Inspect popup
- **Debug Background**: chrome://extensions/ → Details → Inspect views: service worker
- **Debug Options**: Right-click extension icon → Options → F12 for console

### Key Files to Monitor During Development
- `manifest.json` - Extension configuration (requires reload after changes)
- `background.js` - Service worker (requires extension reload)
- `popup.js`, `popup.html` - Main UI (can be hot-reloaded by closing/opening popup)
- `options.js`, `options.html` - Settings page

## Architecture Overview

### Core Components

1. **Service Worker** (`background.js`)
   - Handles OAuth authentication for Outlook/Azure AD
   - Manages PKCE flow for secure token exchange
   - No persistent background page (Manifest V3)

2. **Popup Interface** (`popup.js`, `popup.html`)
   - Main time tracking interface with dual timers
   - Multi-tasking support (meeting + task simultaneously)
   - Quick action buttons for common tasks
   - Goal/deliverable selection and progress tracking

3. **Options Page** (`options.js`, `options.html`)
   - Calendar integration setup (Google/Outlook)
   - AI API key management (OpenAI, Anthropic, Google)
   - Goals & deliverables management
   - Export settings and data management

4. **Calendar Integration**
   - **Google Calendar**: Uses chrome.identity API with OAuth2
   - **Outlook**: Custom PKCE implementation via background service worker
   - Auto-tracking based on calendar events

5. **AI Integration** (`unified-ai-reports.js`, `api-client.js`)
   - Unified API client supporting multiple providers
   - Custom prompt templates and report generation
   - Copy mode (no API key) and API mode (direct generation)

### Data Storage Architecture

All data is stored locally using `chrome.storage.local`:

- **Time Entries**: `{ id, startTime, endTime, task, description, deliverable, goalId, isMultitasking, multitaskingWith }`
- **Goals**: `{ id, name, impact, dailyTarget, targetDate, deliverables[] }`
- **Settings**: Calendar tokens, API keys (encrypted), export preferences
- **Categories**: User-defined task categories
- **Templates**: Custom AI report templates

### Authentication Flow

**Google Calendar:**
```javascript
// Uses built-in chrome.identity
chrome.identity.getAuthToken({ interactive: true }, callback)
```

**Outlook/Azure AD:**
```javascript
// Custom PKCE flow in background.js
// Requires Azure app registration with SPA redirect URI
// URI format: https://[extension-id].chromiumapp.org/
```

## Development Patterns

### Adding New Features

1. **Storage Schema**: Define data structure in chrome.storage.local
2. **UI Components**: Add to popup.html or options.html
3. **Event Handlers**: Wire up in popup.js or options.js
4. **Background Tasks**: Add to background.js if needed (timers, auth)

### Calendar Integration Pattern
```javascript
// Check existing providers in popup.js lines 37-39
// Google: googleCalendarService = new GoogleCalendarService()
// Outlook: handled via background.js OAuth flow
```

### AI Provider Integration Pattern
```javascript
// Follow UnifiedAPIClient pattern in api-client.js
// Add new provider to this.providers object
// Include: endpoint, models[], defaultParams
```

### Multi-tasking Timer Logic
- Primary timer: Regular task tracking
- Meeting timer: Auto-started from calendar events
- Both can run simultaneously with separate displays
- Time entries can have `isMultitasking: true` flag

## Security Considerations

- **API Keys**: Stored encrypted in chrome.storage.local
- **OAuth Tokens**: Handled by chrome.identity (Google) or stored temporarily (Outlook)
- **PKCE**: Implemented for Outlook to prevent token interception
- **CSP**: Defined in manifest.json - be cautious adding new domains
- **Permissions**: Minimal set defined in manifest.json

## Testing Guidelines

### Calendar Integration Testing
1. Test with different calendar providers separately
2. Verify auto-tracking starts/stops correctly
3. Test with overlapping meetings
4. Check timezone handling

### AI Features Testing
1. Test each provider (OpenAI, Anthropic, Google) separately
2. Verify both Copy Mode and API Mode work
3. Test custom templates and model additions
4. Check error handling for invalid API keys

### Multi-tasking Testing
1. Start meeting timer (auto or manual)
2. Start task timer while meeting is running
3. Verify both timers display correctly
4. Check data accuracy in time entries

## Common Issues

### Extension Won't Load
- Check manifest.json syntax
- Verify all referenced files exist
- Check Chrome console for errors

### Calendar Not Syncing
- **Google**: Token may be expired, re-authenticate
- **Outlook**: Verify Azure app configuration and Client ID

### AI Reports Failing
- Test API keys with built-in test buttons
- Check provider account billing status
- Verify internet connectivity

## File Structure Notes

- No package.json - pure vanilla JS Chrome extension
- External libraries: chart.min.js, xlsx.min.js (for reports)
- Icons: icon16.png, icon48.png, icon128.png (required sizes)
- HTML files: popup.html (main UI), options.html (settings), New Tab.html (unused)

## Extension Publishing

When ready to publish:
1. Increment version in manifest.json
2. Ensure all API keys/secrets are removed
3. Test in incognito mode
4. Create screenshots for Chrome Web Store
5. Package as .zip for upload to Chrome Web Store