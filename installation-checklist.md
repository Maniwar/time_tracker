# ✅ Installation Checklist - Time Tracker Extension

## 📂 Files to Copy

Check that you have all these files in your `time-tracker-extension` folder:

### ✅ Core Files (Copy These Exactly)
- [ ] **manifest.json** - From "Complete manifest.json" artifact
- [ ] **popup.html** - From "Complete popup.html" artifact  
- [ ] **popup.js** - From "Complete popup.js" artifact
- [ ] **background.js** - From "Complete background.js" artifact
- [ ] **options.html** - From "Complete options.html" artifact
- [ ] **options.js** - From "Complete options.js" artifact

### ✅ Required Library
- [ ] **xlsx.min.js** - Download from: https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.mini.min.js
  - Save the file as `xlsx.min.js` in your extension folder

### ✅ Icon Files (Create or Download)
- [ ] **icon16.png** - 16x16 pixels
- [ ] **icon48.png** - 48x48 pixels  
- [ ] **icon128.png** - 128x128 pixels

**Quick Icon Solution**: Create simple colored squares in MS Paint or use these placeholder images:
- https://via.placeholder.com/16/0078d4/ffffff?text=T (save as icon16.png)
- https://via.placeholder.com/48/0078d4/ffffff?text=TT (save as icon48.png)
- https://via.placeholder.com/128/0078d4/ffffff?text=TIME (save as icon128.png)

## 🔧 Installation Steps

### 1. Create Extension Folder
```
📁 time-tracker-extension/
   📄 manifest.json
   📄 popup.html
   📄 popup.js
   📄 background.js
   📄 options.html
   📄 options.js
   📄 xlsx.min.js
   🖼️ icon16.png
   🖼️ icon48.png
   🖼️ icon128.png
```

### 2. Load in Chrome
1. Open Chrome browser
2. Type `chrome://extensions/` in address bar
3. Toggle **"Developer mode"** ON (top right corner)
4. Click **"Load unpacked"** button
5. Select your `time-tracker-extension` folder
6. Extension should appear in your extensions list

### 3. Pin the Extension
1. Click the puzzle piece icon in Chrome toolbar
2. Find "Outlook Time Tracker with Multi-tasking"
3. Click the pin icon to keep it visible

## 🧪 Test the Features

### Basic Functionality Test
- [ ] Click extension icon - popup should open
- [ ] Timer displays "00:00:00"
- [ ] Quick action buttons are visible
- [ ] Can start a task timer
- [ ] Can stop the timer
- [ ] Time entry appears in list

### Multi-tasking Test
- [ ] Start a Meeting (button turns orange)
- [ ] Start another task while meeting runs
- [ ] See dual timer display (e.g., "👥 00:00:15 | 💼 00:00:05")
- [ ] Stop task - meeting continues
- [ ] Stop meeting - both timers end

### Export Test
- [ ] Add some time entries
- [ ] Click "Export to Excel"
- [ ] Excel file downloads with 3 sheets:
  - Time Entries
  - Multi-tasking Analysis
  - Summary

### Settings Test
- [ ] Right-click extension icon → Options
- [ ] Settings page opens
- [ ] Can add/remove categories
- [ ] Can select quick actions
- [ ] Statistics show correctly

## 🛠️ Troubleshooting

### Extension Won't Load
```
Error: "Failed to load extension"
```
**Fix**: Check that all files are present and manifest.json is valid JSON

### Popup is Blank
```
Console Error: "xlsx is not defined"
```
**Fix**: Ensure xlsx.min.js is downloaded and in the folder

### Timers Not Working
```
Issue: Timer shows 00:00:00 even after starting
```
**Fix**: 
1. Open DevTools (F12 in popup)
2. Check Console for errors
3. Try reloading extension

### Export Not Working
```
Error: "XLSX is not defined"
```
**Fix**: Re-download xlsx.min.js from the correct URL

## 🚀 Quick Start Guide

### Your First Time Entry
1. Click extension icon
2. Click "📧 Email" button
3. Enter description (optional): "Checking morning emails"
4. Let timer run for a minute
5. Click "📧 Email" again to stop
6. See entry in the list

### Your First Meeting with Multi-tasking
1. Click "👥 Meeting"
2. Enter: "Team standup"
3. Meeting timer starts (orange button)
4. Click "💻 Project Work"
5. Enter: "Code review during meeting"
6. Both timers run simultaneously
7. Click "💻 Project Work" to stop task
8. Click "👥 Meeting" to end meeting
9. Export data to see multi-tasking analysis

## 📊 Understanding Your Data

### Time Entries Sheet
- Raw data of all time tracked
- Shows start/end times
- Indicates multi-tasking with Yes/No flag

### Multi-tasking Analysis Sheet
- Daily breakdown of multi-tasking
- Meeting efficiency percentage
- Shows how much time was multi-tasked

### Summary Sheet
- Category totals
- Productivity scores (100 = focused, <100 = multi-tasked)
- Daily/weekly aggregations

## 🎯 Optional: Outlook Integration

### Requirements
1. Azure account (free)
2. App registration in Azure Portal
3. Client ID from Azure

### Setup Steps (Optional)
1. Go to https://portal.azure.com
2. Create new App Registration
3. Add redirect URI: `https://<extension-id>.chromiumapp.org/`
4. Copy Application (client) ID
5. Paste in extension Options → Microsoft Account
6. Click "Connect to Outlook"

**Note**: The extension works perfectly without Outlook integration!

## ✨ Tips for Success

1. **Be Consistent**: Track all your time for accurate insights
2. **Use Descriptions**: Add brief descriptions for better reporting
3. **Review Weekly**: Export data weekly to spot patterns
4. **Optimize Meetings**: Use multi-tasking data to identify inefficient meetings
5. **Set Boundaries**: Try to reduce multi-tasking for better focus

## 🎉 Congratulations!

Your Time Tracker with Multi-tasking Support is ready to use! 

Start tracking your time and discover insights about your work patterns.

---

**Need Help?**
- Check browser console (F12) for errors
- Verify all files are copied correctly
- Try disabling and re-enabling the extension
- Reload the extension from chrome://extensions/

**Version**: 2.0.0  
**Features**: Time tracking, meeting multi-tasking, Excel export, productivity analysis