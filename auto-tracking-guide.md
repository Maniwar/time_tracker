# 🤖 Auto-Tracking Feature Guide

## Overview
The auto-tracking feature automatically starts and stops meeting timers based on your Outlook calendar schedule, while still allowing manual control to end meetings early or handle unexpected changes.

## ✨ Key Features

### 1. **Automatic Meeting Start**
- Meetings start tracking automatically at their scheduled time
- Configurable grace period (0-10 minutes before scheduled start)
- Visual indicator shows "[AUTO]" prefix and "Meeting (Auto)" button
- Notification appears when auto-tracking begins

### 2. **Flexible End Options**
- **Scheduled End**: Meeting stops automatically at scheduled time
- **End Early**: Click "End Early" button if meeting finishes sooner
- **Override**: Manually stop via Meeting button with confirmation
- **Time Saved**: Tracks how many minutes were saved when ending early

### 3. **Smart Multi-tasking**
- Auto-tracked meetings support full multi-tasking
- Start other tasks while meeting runs automatically
- Dual timer shows both meeting and task progress
- Remaining time indicator (shows when <5 minutes left)

## 🔧 Setup Instructions

### Enable Auto-Tracking
1. Click extension icon → Right-click → Options
2. Find **"Auto-Tracking Settings"** section
3. Check **"Enable auto-tracking for Outlook meetings"**
4. Configure settings:
   - **Grace Period**: When to start (0-10 min before)
   - **Notifications**: Show start/end alerts
   - **Auto-End**: Stop at scheduled time or continue

### Settings Explained

| Setting | Options | Recommendation |
|---------|---------|----------------|
| **Grace Period** | 0, 2, 5, 10 minutes | 2 minutes - Captures prep time |
| **Notifications** | On/Off | On - Stay informed |
| **Auto-End** | Yes/No | Yes - Matches calendar |

## 📊 How It Works

### Timeline Example
```
9:58 AM - Grace period begins (2 min before)
9:59 AM - Auto-tracking starts
10:00 AM - Meeting scheduled start
10:25 AM - You click "End Early" (saved 5 min)
10:30 AM - Originally scheduled end
```

### Data Captured
- **Actual Duration**: Real time spent (25 minutes)
- **Scheduled Duration**: Calendar time (30 minutes)
- **Time Saved**: Difference when ended early (5 minutes)
- **Multi-tasking**: Any tasks done during meeting
- **Auto-Track Flag**: Identifies auto vs manual tracking

## 🎯 Use Cases

### Standard Meeting Flow
1. Calendar shows 10 AM team standup
2. At 9:58 AM, timer auto-starts
3. Meeting runs its course
4. At 10:30 AM, timer auto-stops
5. Entry saved with actual 32-minute duration

### Early Finish Flow
1. Calendar shows 2 PM client call (1 hour)
2. At 1:58 PM, timer auto-starts
3. Call ends at 2:40 PM
4. Click "End Early" button
5. Entry saved: "Client Call [Ended 20m early]"

### Multi-tasking Flow
1. Calendar shows 3 PM planning meeting
2. At 2:58 PM, meeting timer auto-starts
3. At 3:05 PM, start "Email" task
4. Both timers run (meeting + email)
5. At 4:00 PM, meeting auto-ends
6. Continue email task or stop manually

## 🎮 UI Indicators

### Visual Cues
- **Orange Meeting Button**: "Meeting (Auto)" vs "Meeting (Active)"
- **Status Bar**: Shows meeting name with "End Early" button
- **Timer Display**: Shows remaining time when <5 minutes
- **Notifications**: Toast messages for start/end events

### Status Messages
- `⏰ Auto-started: Team Standup` - Meeting began
- `Meeting ended 15 minutes early` - Saved time
- `⏰ Meeting ended: Team Standup` - Scheduled end
- `(3m left)` - Time remaining indicator

## 💡 Tips & Best Practices

### Optimize Your Workflow
1. **Enable for all meetings** - Get complete time data
2. **Use "End Early" actively** - Track actual vs scheduled
3. **Multi-task in long meetings** - Capture real work patterns
4. **Review weekly** - Identify meetings to shorten/skip

### Advanced Features
- **Overlapping Meetings**: Only one auto-tracks at a time
- **All-Day Events**: Ignored by auto-tracking
- **Recurring Meetings**: Each instance tracks separately
- **Manual Override**: Always available via Meeting button

## 📈 Benefits

### For You
- **Zero friction** - No need to remember to start/stop
- **Accurate data** - Real meeting duration captured
- **Time insights** - See how much time you save
- **Productivity** - Multi-task without losing tracking

### For Teams
- **Meeting efficiency** - Data on actual vs scheduled time
- **Optimization** - Identify meetings that consistently end early
- **Accountability** - Automatic tracking ensures accuracy
- **Reports** - Export shows auto-tracked vs manual entries

## 🔍 Troubleshooting

### Not Auto-Starting?
- Check: Auto-tracking enabled in settings?
- Check: Outlook connected and synced?
- Check: Meeting is today and not all-day?
- Check: No other meeting currently tracking?

### Not Auto-Ending?
- Check: "Auto-End" setting enabled?
- Check: Scheduled end time reached?
- Note: Manually started meetings don't auto-end

### Wrong Times?
- Verify: Time zones match in Outlook
- Sync: Click "Sync" to refresh meetings
- Check: System clock is accurate

## 📊 Export Data

Auto-tracked meetings in exports show:
- `autoTracked: true` flag
- `endedEarly: true` if stopped before schedule
- Time saved in description
- Actual vs scheduled duration
- Multi-tasking during meeting

## 🚀 Quick Start

1. **Enable**: Settings → Auto-Tracking → ✓ Enable
2. **Sync**: Click "Sync" to load today's meetings
3. **Wait**: Meetings auto-start at scheduled time
4. **Interact**: End early if needed, or let auto-end
5. **Export**: Review data with auto-tracking insights

---

**Note**: Auto-tracking requires Outlook connection. Manual meeting tracking always remains available via the Meeting quick action button.