# 📊 Universal Time Tracker - Chrome Extension

### *The only time tracker that admits you multitask during meetings*

[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](https://github.com/Maniwar/time_tracker)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/chrome-extension-orange.svg)](https://chrome.google.com/webstore)
[![Sponsor](https://img.shields.io/badge/sponsor-GitHub%20Sponsors-ea4aaa.svg)](https://github.com/sponsors/Maniwar)

## 🎯 Why This Exists

Time doesn't just slip through our fingers—it gets absorbed by meetings, "quick questions," and context switching that never shows up in reports. Without data, these invisible hours become invisible problems.

**Universal Time Tracker** gives you the ammunition to prove what you already know: your team needs more people.

## 🎥 Demo Video

<p align="center">
  <a href="https://www.youtube.com/watch?v=npvJVmmRK5o">
    <img src="https://img.youtube.com/vi/RmL0jU15L8o/hqdefault.jpg" alt="Universal Time Tracker — Demo Video" width="720" />
  </a>
  <br/>
  <sub>Click to watch on YouTube</sub>
</p>

## 📸 Screenshots

<table>
  <tr>
    <td align="center">
      <a href="screenshots/screen_timetrackerpop.png">
        <img src="screenshots/screen_timetrackerpop.png" alt="Tracker Popup" width="260">
      </a><br>
      <sub><b>Tracker Popup</b></sub>
    </td>
    <td align="center">
      <a href="screenshots/screen_addgoals.png">
        <img src="screenshots/screen_addgoals.png" alt="Add Goals" width="260">
      </a><br>
      <sub><b>Add Goals</b></sub>
    </td>
    <td align="center">
      <a href="screenshots/screen_timeentries.png">
        <img src="screenshots/screen_timeentries.png" alt="Time Entries" width="260">
      </a><br>
      <sub><b>Time Entries</b></sub>
    </td>
  </tr>
</table>

<details>
  <summary align="right">▶ More screenshots</summary>

  <br>

  <table>
    <tr>
      <td align="center">
        <a href="screenshots/screen_timebycategorysummary.png">
          <img src="screenshots/screen_timebycategorysummary.png" alt="Category Summary" width="260">
        </a><br>
        <sub><b>Category Summary</b></sub>
      </td>
      <td align="center">
        <a href="screenshots/screen_calendar_export.png">
          <img src="screenshots/screen_calendar_export.png" alt="Calendar Export" width="260">
        </a><br>
        <sub><b>Calendar Export</b></sub>
      </td>
      <td align="center">
        <em>&nbsp;</em>
      </td>
    </tr>
  </table>

</details>

## ✨ Features

### 🔥 Core Features
- **Multi-tasking Tracking** - Finally, honest data about doing email during meetings
- **Auto-Tracking** - Meetings start/stop automatically based on your calendar
- **Universal Calendar Support** - Works with both Google Calendar and Outlook
- **Quick Actions** - One-click tracking for your most common tasks
- **Manual Entry** - Forgot to track? Add time after the fact
- **Goals & Deliverables** - Connect time to actual outcomes
- **Impact Tracking** - Define what you want to achieve and track progress

### 🤖 AI-Powered Features (NEW!)
- **AI Report Generation** - Generate professional reports using OpenAI, Anthropic Claude, or Google Gemini
- **Custom AI Models** - Add new models as they become available
- **Custom Report Templates** - Create and save your own analysis templates
- **Smart Prompts** - Pre-built templates for productivity, executive, and team reports
- **Copy Mode** - Generate formatted prompts to use with any LLM
- **API Mode** - Direct integration with AI providers
- **Report History** - Save and manage your generated reports

### 📈 Analytics & Reporting
- **Excel Export** - Comprehensive reports with multiple analysis sheets
- **Multi-tasking Analysis** - See your real productivity patterns
- **Meeting Efficiency** - Discover what % of meetings involve multitasking
- **Productivity Scoring** - Understand focus time vs. fragmented time
- **Time Saved Tracking** - Know when meetings end early
- **Category Breakdowns** - Visual charts of where time really goes
- **Deliverable Analysis** - Track hours spent on specific outcomes
- **Goal Progress Tracking** - Monitor achievement against targets

### 🎯 Unique Features
- **Dual Timer Display** - See both meeting and task time simultaneously
- **End Early Button** - Capture actual vs. scheduled meeting time
- **Deliverable Tracking** - Link time to specific outcomes
- **Goal Progress** - Daily targets with visual progress bars
- **Auto-sync** - Pull meetings from multiple calendars
- **Privacy First** - All data stays local in your browser
- **Custom Categories** - Define your own task types
- **Productivity Insights** - Daily patterns and focus metrics

## 🚀 Installation

### Quick Install (For Your Team)

1. **Download** the extension folder from [here](https://github.com/Maniwar/time_tracker/archive/refs/heads/main.zip)
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the extension folder
6. Pin the extension to your toolbar

### Build From Source

```bash
git clone https://github.com/Maniwar/time_tracker.git
cd time_tracker
# No build needed - it's vanilla JS!
```

## 🔧 Complete Setup Guide

### 📅 1. Calendar Integration

#### Google Calendar Setup (Easy - One Click)
1. Click the extension icon in your toolbar
2. In the Calendar Setup section, click **Connect** next to Google Calendar
3. Sign in with your Google account
4. Approve the requested permissions (read-only calendar access)
5. Done! Your meetings will auto-populate

#### Outlook Calendar Setup (Requires Azure Configuration)

##### Step 1: Create Azure App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure your app:
   - **Name**: Universal Time Tracker (or any name you prefer)
   - **Supported account types**: Select based on your needs:
     - Personal Microsoft accounts only (for personal use)
     - Accounts in any organizational directory (for work accounts)
     - Both (recommended for maximum flexibility)
   - **Redirect URI**: 
     - Select "Single-page application (SPA)" from dropdown
     - Get your extension ID from `chrome://extensions/`
     - Enter: `https://[YOUR-EXTENSION-ID].chromiumapp.org/`
     - Example: `https://abcdefghijklmnopqrstuvwxyz.chromiumapp.org/`

##### Step 2: Configure App Permissions
1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `User.Read` (to get user info)
   - `Calendars.Read` (to read calendar events)
   - `offline_access` (for token refresh)
6. Click **Add permissions**
7. (Optional) Click **Grant admin consent** if you're an admin

##### Step 3: Configure Extension
1. Copy your **Application (client) ID** from Azure Overview page
2. Open the extension options:
   - Right-click extension icon → **Options**
   - Or go to `chrome://extensions/` → Universal Time Tracker → Details → Extension options
3. Go to **Overview** tab → **Calendar Accounts** section
4. Paste your Client ID in the Outlook section
5. Click **Save Client ID**
6. Return to extension popup → Click **Connect** next to Outlook

### 🤖 2. AI Report Features Setup

The extension supports three AI providers for report generation. You can use any or all of them.

#### OpenAI Setup
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign in or create an account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click **Create new secret key**
5. Copy the key (starts with `sk-...`)
6. In extension options → **AI Reports** tab → **API Key Management**
7. Paste key in **OpenAI API Key** field
8. Click **Save** then **Test** to verify

**Available Models:**
- GPT-4 Turbo
- GPT-4
- GPT-3.5 Turbo
- Custom models (add your own)

#### Anthropic Claude Setup
1. Go to [Anthropic Console](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to API Keys section
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-...`)
6. In extension options → **AI Reports** tab
7. Paste key in **Anthropic API Key** field
8. Click **Save** then **Test** to verify

**Available Models:**
- Claude 3 Opus
- Claude 3 Sonnet
- Claude 3 Haiku
- Claude 2.1
- Custom models (add your own)

#### Google Gemini Setup
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Choose a project or create new
5. Copy the key (starts with `AIza...`)
6. In extension options → **AI Reports** tab
7. Paste key in **Google Gemini API Key** field
8. Click **Save** then **Test** to verify

**Available Models:**
- Gemini Pro
- Gemini Pro Vision
- Custom models (add your own)

### 🎨 3. Customization

#### Adding Custom AI Models
As new models are released, you can add them without waiting for updates:

1. Go to Options → **AI Reports** tab
2. Scroll to **Custom AI Models** section
3. Click **+ Add Custom Model**
4. Fill in the details:
   - **Provider**: Select OpenAI, Anthropic, or Google
   - **Model ID**: The exact API identifier (e.g., `gpt-4-vision-preview`)
   - **Display Name**: Friendly name shown in UI (e.g., `GPT-4 Vision`)
   - **Max Tokens**: Context window size (default: 128000)
   - **Set as default**: Check to make this the default for the provider
5. Click **Save Model**

#### Creating Custom Report Templates
Build your own analysis templates:

1. Go to Options → **AI Reports** tab
2. Find **Custom Prompt Templates** section
3. Click **+ Add Custom Template**
4. Enter template details:
   - **Template Name**: Descriptive name (e.g., "Weekly Team Review")
   - **System Prompt**: Define the AI's role and expertise
   - **User Prompt**: Specify the analysis you want

**System Prompt Example:**
```
You are a senior engineering manager analyzing team productivity data. 
Focus on identifying bottlenecks, meeting efficiency, and resource allocation. 
Provide actionable recommendations for improving team velocity.
```

**User Prompt Example:**
```
Analyze the time tracking data for our engineering team. Focus on:
1. Meeting load and its impact on deep work time
2. Multi-tasking patterns during meetings
3. Time allocation across different project priorities
4. Recommendations for optimizing our schedule
Keep the analysis concise and action-oriented.
```

5. Click **Save Template**
6. Your template will appear in the report generator dropdown

#### Modifying Built-in Templates
1. In the popup, click **Generate AI Report**
2. Select a built-in template from the dropdown
3. Modify the System and User prompts as needed
4. Click the save icon to save as a new custom template

#### Managing Categories
1. Go to Options → **Tracking** tab
2. In **Categories** section:
   - View all existing categories
   - Add new categories with the input field
   - Delete categories with the × button
3. Categories appear in all dropdowns throughout the extension

#### Quick Actions Configuration
Set your 6 most-used task types for one-click tracking:

1. Go to Options → **Tracking** tab
2. In **Quick Actions** section
3. Select up to 6 categories from your list
4. These appear as buttons in the main popup
5. Click **Save Quick Actions**

### ⚙️ 4. Settings Configuration

#### Auto-Tracking Settings
1. Go to Options → **Tracking** tab
2. Configure auto-tracking:
   - **Enable Auto-tracking**: Toggle on/off
   - **Grace Period**: Minutes before meeting to start tracking (default: 2)
   - **End Grace**: Minutes after scheduled end to stop (default: 5)
   - **Providers**: Choose which calendars to auto-track

#### Export Settings
1. Go to Options → **Export** tab
2. Configure export preferences:
   - **Include Summary Sheet**: Overview statistics
   - **Include Charts**: Visual representations
   - **Include Multi-tasking Analysis**: Detailed productivity metrics
   - **Include Deliverables**: Goal and deliverable tracking
   - **Date Format**: Choose your preferred format

#### Goals & Deliverables Setup
1. Go to Options → **Goals & Deliverables** tab
2. **Add a Goal**:
   - Click **+ Add Goal**
   - Enter goal name and impact description
   - Set daily hour target
   - Click **Save**
3. **Add Deliverables**:
   - Under each goal, click **+ Add Deliverable**
   - Enter deliverable name
   - Link to parent goal (optional)
   - Track time against specific deliverables

### 📊 5. Using AI Reports

#### Copy Mode (No API Key Required)
1. Click extension icon → **Generate AI Report**
2. Select **Copy Mode** (default if no API keys configured)
3. Choose report template
4. Select date range and options
5. Click **Generate Report**
6. Copy the formatted prompt
7. Paste into ChatGPT, Claude, Gemini, or any LLM

#### API Mode (Direct Generation)
1. Ensure API keys are configured (see setup above)
2. Click extension icon → **Generate AI Report**
3. Select **API Mode**
4. Choose provider and model
5. Select template or customize prompts
6. Configure parameters:
   - **Temperature**: 0 (focused) to 1 (creative)
   - **Max Tokens**: Response length limit
7. Click **Generate Report**
8. Report generates directly in the extension
9. Copy or save the results

#### Managing Report History
1. Go to Options → **AI Reports** tab
2. Scroll to **Report History** section
3. View all previously generated reports
4. Click on any report to view full content
5. Use **Clear All Reports** to delete history

## 💡 Advanced Usage

### Data Management

#### Backup Your Data
1. Go to Options → **Data** tab
2. Click **Export Data Backup**
3. Save the JSON file to a safe location
4. Contains all time entries, goals, deliverables, and settings

#### Restore from Backup
1. Go to Options → **Data** tab
2. Click **Import Data**
3. Select your backup JSON file
4. Choose merge or replace option
5. Confirm the import

#### Clear Data
1. Go to Options → **Data** tab
2. Use selective clearing:
   - **Clear Time Entries**: Remove all tracked time
   - **Clear Goals**: Remove goals and deliverables
   - **Clear Settings**: Reset to defaults
   - **Factory Reset**: Complete data wipe

### Multi-tasking Tracking

#### During Meetings
```
1. Meeting starts (auto or manual)
2. Timer shows: "👥 Meeting: Team Standup"
3. Start another task: Click "📧 Email"
4. Display shows: "👥 00:15:00 | 📧 00:05:00"
5. Both timers run simultaneously
6. Stop each independently
```

#### Manual Multi-tasking Entry
1. Click **+ Add Time Entry**
2. Enter primary task details
3. Check **"I was multi-tasking"**
4. Select what you were doing simultaneously
5. Time is properly attributed to both activities

### Productivity Analysis

#### Understanding Metrics
- **Multi-tasking %**: Percentage of time doing multiple things
  - < 20%: Highly focused
  - 20-40%: Balanced
  - > 40%: High context switching

- **Meeting Efficiency**: Multi-tasking during meetings
  - 0-20%: Engaged meetings
  - 20-50%: Some disengagement
  - > 50%: Meeting overload likely

- **Productivity Score**: 
  - 100: Fully focused work
  - 80-99: Mostly focused with some overlap
  - < 80: High fragmentation

## 🔒 Privacy & Security

### Data Storage
- **100% Local**: All data stored in browser's local storage
- **No Cloud Sync**: Unless you explicitly export/import
- **No Telemetry**: Zero tracking or analytics
- **No Account**: Start immediately, no registration

### API Key Security
- **Encrypted Storage**: API keys are encrypted locally
- **Never Transmitted**: Keys never sent to our servers (we have none)
- **Scoped Access**: Only permissions you explicitly grant
- **Revokable**: Remove keys anytime from options

### Calendar Permissions
- **Read-Only**: Cannot modify your calendar
- **Limited Scope**: Only calendar data, no emails or files
- **OAuth 2.0**: Industry-standard secure authentication
- **PKCE Protection**: Additional security for Outlook integration

## 🤝 Troubleshooting

### Extension Not Working?
1. Check Chrome version (must be 88+)
2. Go to `chrome://extensions/`
3. Find Universal Time Tracker
4. Toggle off and on
5. Click refresh icon
6. Check console (F12) for errors

### Calendar Not Syncing?

**Google Calendar Issues:**
- Ensure you're logged into Google
- Revoke and re-grant permissions
- Check calendar is not empty
- Try disconnecting and reconnecting

**Outlook Calendar Issues:**
- Verify Client ID is correct
- Check redirect URI matches exactly
- Ensure app permissions in Azure
- Token may be expired - reconnect
- Check Azure app is not disabled

### AI Reports Not Working?

**API Key Issues:**
- Test key with the Test button
- Check key hasn't expired
- Verify billing is active on provider account
- Ensure correct key format (provider-specific prefix)

**Generation Errors:**
- Reduce max tokens if hitting limits
- Check data exists for selected date range
- Try a different model
- Verify internet connection

### Data Issues?
- Export backup before troubleshooting
- Check storage: `chrome.storage.local.getBytesInUse()`
- Clear corrupted data selectively
- Import from recent backup

## 📜 License

MIT License - Use it, modify it, share it. Just make work better.

## 🙏 Acknowledgments

Built by [@Maniwar](https://github.com/Maniwar) because time tracking shouldn't feel like surveillance.

Special thanks to everyone who's used this to get their team the help they need.

## 💖 Support Development

This tool is free and always will be. If it helped you:

[![Sponsor on GitHub](https://img.shields.io/badge/sponsor-GitHub%20Sponsors-ea4aaa.svg)](https://github.com/sponsors/Maniwar)
[![Star on GitHub](https://img.shields.io/github/stars/Maniwar/time_tracker.svg?style=social)](https://github.com/Maniwar/time_tracker)

Or just [share your success story](https://www.linkedin.com/sharing/share-offsite/?url=https://github.com/Maniwar/time_tracker) - that's payment enough.

## 💰 Pricing

**Free. Forever. No BS.**

- No premium tiers
- No locked features  
- No user limits
- No trial period
- Just free

If it helps you get headcount or saves your sanity, consider [sponsoring](https://github.com/sponsors/Maniwar). Or don't. Really.

---

**Remember:** Every untracked hour is an invisible argument against your headcount request. Every tracked hour is evidence that your team needs help.

*Start tracking. Get the data. Build your case. Get your team the reinforcements they deserve.*

---

<p align="center">
  <strong>Questions?</strong> Open an issue<br>
  <strong>Love it?</strong> Star it<br>
  <strong>Improved your work life?</strong> <a href="https://github.com/sponsors/Maniwar">Buy me coffee</a><br>
  <br>
  <em>"In God we trust. All others must bring data."</em><br>
  — W. Edwards Deming
</p>
