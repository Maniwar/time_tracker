# Time Tracker Chrome Extension - Setup Guide

## 📋 Required Files

To set up the complete time tracker with meeting multi-tasking support, you need these files:

### Core Files (Updated with Multi-tasking)
1. **popup.html** - Main UI (copy from Complete popup.html artifact)
2. **popup.js** - Main logic (copy from Complete popup.js artifact)
3. **manifest.json** - Extension configuration (copy from Complete manifest.json artifact)

### Supporting Files (Keep your existing versions)
4. **background.js** - Background service worker
5. **options.html** - Settings page
6. **options.js** - Settings logic
7. **xlsx.min.js** - Excel export library (download from [SheetJS CDN](https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.mini.min.js))

### Icon Files (Create or use existing)
8. **icon16.png** - 16x16 icon
9. **icon48.png** - 48x48 icon
10. **icon128.png** - 128x128 icon

## 🚀 Installation Steps

### Step 1: Prepare Files
1. Create a new folder called `time-tracker-extension`
2. Copy the updated **popup.html**, **popup.js**, and **manifest.json** files
3. Copy your existing **background.js**, **options.html**, and **options.js** files
4. Download **xlsx.min.js** from SheetJS and place in the folder
5. Add icon files (or create simple placeholder icons)

### Step 2: Install Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select your `time-tracker-extension` folder
5. The extension will appear in your extensions bar

### Step 3: Configure (Optional)
1. Click the extension icon and then the settings gear
2. Add your Azure App Client ID if using Outlook integration
3. Customize quick actions and categories

## 🎯 Using the Multi-tasking Feature

### Meeting Mode
1. **Start a Meeting**: Click the Meeting button
   - Button turns orange with pulsing effect
   - Meeting timer starts
   - Status bar shows "Currently in a meeting"

2. **Multi-task During Meeting**: Click any other task button
   - Both timers run simultaneously
   - Display shows: `👥 HH:MM:SS | 💼 HH:MM:SS`
   - Background shows gradient effect

3. **Switch Tasks**: Click a different task button
   - Meeting continues running
   - New task replaces the previous task
   - Multi-tasking indicator stays active

4. **End Meeting**: Click Meeting button again
   - Confirm to end the meeting
   - Meeting time is saved with multi-tasking data

### Export & Analysis
1. Select date range (Today, Week, Month, Custom, etc.)
2. Click "Export to Excel with Multi-task Analysis"
3. Excel file includes three sheets:
   - **Time Entries**: All tasks with multi-tasking flags
   - **Multi-tasking Analysis**: Daily breakdown and efficiency metrics
   - **Summary**: Category totals and productivity scores

## 📁 File Structure
```
time-tracker-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI
├── popup.js              # Main logic with multi-tasking
├── background.js         # Background service worker
├── options.html          # Settings page
├── options.js            # Settings logic
├── xlsx.min.js           # Excel export library
├── icon16.png           # Small icon
├── icon48.png           # Medium icon
└── icon128.png          # Large icon
```

## ⚙️ Background.js Template (if needed)

If you don't have a background.js file, here's a minimal template:

```javascript
// background.js - Minimal template
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'authenticate') {
    // Handle Outlook authentication
    sendResponse({ success: false, error: 'Authentication not configured' });
  } else if (request.action === 'fetchEvents') {
    // Handle fetching calendar events
    sendResponse({ success: false, error: 'Calendar sync not configured' });
  }
  return true; // Keep message channel open for async response
});
```

## 🔧 Troubleshooting

### Extension not loading
- Check all file paths in manifest.json
- Ensure all files are in the same folder
- Check Chrome console for errors (F12 in popup)

### Multi-tasking not working
- Refresh the extension (chrome://extensions → Reload)
- Check if storage permissions are granted
- Clear extension data and try again

### Export not working
- Ensure xlsx.min.js is loaded correctly
- Check console for errors
- Try with a smaller date range first

## 🎨 Customization

### Change Meeting Color
In popup.html, find and modify:
- Orange color: `#d83b01` → Your preferred color
- Gradient: `linear-gradient(90deg, #d83b01, #e74c0e)`

### Adjust Productivity Score
In popup.js, find `calculateSummary` function:
- Change multiplier in: `100 - (dayMultitasking / dayTotal * 50)`
- Higher number = multi-tasking penalized more

### Add More Categories
1. Open extension options
2. Add new categories
3. Select which appear as quick actions

## 📊 Understanding the Metrics

### Multi-tasking Analysis Sheet
- **Multi-tasking Hours**: Total time spent doing multiple activities
- **Meeting Multi-tasking Hours**: Time spent working during meetings
- **Multi-tasking %**: Percentage of day spent multi-tasking
- **Meeting Efficiency**: Shows what % of meeting time involved other work

### Productivity Score
- 100 = No multi-tasking (fully focused)
- 50 = All time was multi-tasked
- Formula weights multi-tasking as 50% less productive

## 💡 Tips for Best Results

1. **Be Honest**: Track actual multi-tasking for accurate insights
2. **Review Weekly**: Export data weekly to identify patterns
3. **Set Goals**: Use data to reduce unnecessary meetings
4. **Share Insights**: Show meeting efficiency data to optimize team schedules

## 🆘 Support

For issues or questions:
1. Check the browser console for errors (F12)
2. Review the troubleshooting section
3. Ensure all files are properly copied
4. Try disabling and re-enabling the extension

## 📝 Version History

- **v2.0.0**: Added meeting multi-tasking support
- **v1.0.0**: Initial release with basic time tracking

---

**Note**: The Outlook integration requires Azure App registration and configuration. The multi-tasking feature works independently of Outlook connection.