// Complete popup.js with Deliverables and Goals Support
// Version 2.3.0 - Now with Deliverables and Goals tracking

let currentTimer = null;
let startTime = null;
let currentTask = null;
let currentTaskDescription = null;
let currentDeliverable = null; // NEW: Track current deliverable

// Meeting-specific variables for multi-tasking
let meetingTimer = null;
let meetingStartTime = null;
let meetingDescription = null;
let isInMeeting = false;
let scheduledMeetingEndTime = null;
let currentMeetingId = null;

// Quick action state
let pendingQuickAction = null;

let currentDateRange = 'today';
let customStartDate = null;
let customEndDate = null;

// Auto-tracking check interval
let autoTrackInterval = null;

// Calendar service instances
let googleCalendarService = null;
let activeCalendarProvider = 'all';
let connectedProviders = [];

// Initialize Google Calendar service
function initializeCalendarServices() {
  googleCalendarService = new GoogleCalendarService();
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async function() {
  // Initialize Google Calendar service FIRST
  initializeCalendarServices();
  
  // Load export settings FIRST to set default date range
  chrome.storage.local.get(['exportSettings'], (result) => {
    const settings = result.exportSettings || { defaultDateRange: 'today' };
    currentDateRange = settings.defaultDateRange;
    document.getElementById('dateRangeSelect').value = currentDateRange;
    
    // Handle custom date range visibility
    if (currentDateRange === 'custom') {
      document.getElementById('customDateRange').style.display = 'flex';
    }
    
    // Now proceed with the rest of initialization
    initializeApp();
  });
});

// Separate initialization function
async function initializeApp() {
  await checkAuthStatus();
  setupEventListeners();
  setupCalendarProviderListeners();
  loadCategories();
  loadDeliverables(); // NEW: Load deliverables
  loadGoalsProgress(); // NEW: Load goals progress
  initializeDateInputs();
  loadDataForDateRange();
  loadCategoryTotals();
  checkForRunningTimers();
  setInterval(updateTimers, 1000);
  setInterval(loadCategoryTotals, 30000);
  setInterval(loadGoalsProgress, 60000); // Update goals every minute
  
  // Start auto-tracking check
  startAutoTrackingCheck();
}

// NEW: Load deliverables for dropdowns
function loadDeliverables() {
  chrome.storage.local.get(['deliverables', 'goals'], (result) => {
    const deliverables = result.deliverables || [];
    const goals = result.goals || [];
    
    // Filter out completed items
    const activeDeliverables = deliverables.filter(d => !d.completed);
    const activeGoals = goals.filter(g => !g.completed);
    
    // Group deliverables by active goals
    const deliverablesByGoal = {};
    const unassignedDeliverables = [];
    
    activeDeliverables.forEach(deliverable => {
      if (deliverable.goalId && activeGoals.find(g => g.id === deliverable.goalId)) {
        if (!deliverablesByGoal[deliverable.goalId]) {
          deliverablesByGoal[deliverable.goalId] = [];
        }
        deliverablesByGoal[deliverable.goalId].push(deliverable);
      } else {
        unassignedDeliverables.push(deliverable);
      }
    });
    
    // Update all deliverable dropdowns
    const dropdowns = [
      document.getElementById('manualDeliverable'),
      document.getElementById('quickDeliverable')
    ];
    
    dropdowns.forEach(select => {
      if (!select) return;
      
      // Preserve current selection
      const currentValue = select.value;
      
      // Build options HTML
      let optionsHTML = `
        <option value="">No deliverable</option>
        <option value="_new">+ Create new deliverable...</option>
      `;
      
      // Add deliverables grouped by active goals
      activeGoals.forEach(goal => {
        if (deliverablesByGoal[goal.id] && deliverablesByGoal[goal.id].length > 0) {
          optionsHTML += `<optgroup label="${goal.name}">`;
          deliverablesByGoal[goal.id].forEach(deliverable => {
            optionsHTML += `<option value="${deliverable.id}">${deliverable.name}</option>`;
          });
          optionsHTML += `</optgroup>`;
        }
      });
      
      // Add unassigned deliverables
      if (unassignedDeliverables.length > 0) {
        optionsHTML += `<optgroup label="Other Deliverables">`;
        unassignedDeliverables.forEach(deliverable => {
          optionsHTML += `<option value="${deliverable.id}">${deliverable.name}</option>`;
        });
        optionsHTML += `</optgroup>`;
      }
      
      select.innerHTML = optionsHTML;
      
      // Restore selection if it still exists and isn't completed
      if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
      }
    });
  });
}

// NEW: Load and display goals progress
function loadGoalsProgress() {
  chrome.storage.local.get(['goals', 'deliverables', 'timeEntries'], (result) => {
    const goals = result.goals || [];
    const deliverables = result.deliverables || [];
    const timeEntries = result.timeEntries || {};
    
    // Filter to only active (non-completed) goals
    const activeGoals = goals.filter(g => !g.completed);
    
    if (activeGoals.length === 0) {
      document.getElementById('goalsProgress').classList.remove('active');
      return;
    }
    
    // Calculate time spent on each active goal today
    const today = new Date().toDateString();
    const todayEntries = timeEntries[today] || [];
    
    const goalProgress = {};
    activeGoals.forEach(goal => {
      goalProgress[goal.id] = {
        goal: goal,
        timeSpent: 0,
        deliverableIds: deliverables.filter(d => d.goalId === goal.id && !d.completed).map(d => d.id)
      };
    });
    
    // Sum up time for each goal based on active deliverables
    todayEntries.forEach(entry => {
      if (entry.deliverableId) {
        Object.values(goalProgress).forEach(progress => {
          if (progress.deliverableIds.includes(entry.deliverableId)) {
            progress.timeSpent += entry.duration;
          }
        });
      }
    });
    
    // Filter to show only goals with time today or daily targets
    const activeGoalsWithProgress = Object.values(goalProgress).filter(progress => 
      progress.timeSpent > 0 || (progress.goal.dailyTarget && progress.goal.dailyTarget > 0)
    );
    
    if (activeGoalsWithProgress.length === 0) {
      document.getElementById('goalsProgress').classList.remove('active');
      return;
    }
    
    // Display goals progress
    const progressList = document.getElementById('goalsProgressList');
    progressList.innerHTML = activeGoalsWithProgress.map(progress => {
      const hours = progress.timeSpent / 3600000;
      const target = progress.goal.dailyTarget || 0;
      const percentage = target > 0 ? Math.min((hours / target) * 100, 100) : 0;
      
      return `
        <div class="goal-item">
          <div class="goal-name">
            <span>${progress.goal.name}</span>
            <span>${hours.toFixed(1)}h${target > 0 ? ` / ${target}h` : ''}</span>
          </div>
          ${target > 0 ? `
            <div class="goal-progress-bar">
              <div class="goal-progress-fill" style="width: ${percentage}%"></div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    document.getElementById('goalsProgress').classList.add('active');
  });
}

// NEW: Create deliverable quickly
async function createQuickDeliverable(name, selectElement) {
  if (!name || !name.trim()) return null;
  
  const deliverableId = `deliverable_${Date.now()}`;
  const newDeliverable = {
    id: deliverableId,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    goalId: null, // Can be assigned to a goal later in settings
    completed: false // Explicitly set as not completed
  };
  
  // Save to storage
  return new Promise((resolve) => {
    chrome.storage.local.get(['deliverables'], (result) => {
      const deliverables = result.deliverables || [];
      deliverables.push(newDeliverable);
      
      chrome.storage.local.set({ deliverables }, () => {
        // Reload deliverables in all dropdowns
        loadDeliverables();
        
        // Select the new deliverable
        setTimeout(() => {
          if (selectElement) {
            selectElement.value = deliverableId;
          }
        }, 100);
        
        showNotification(`Created deliverable: ${name}`, 'success');
        resolve(deliverableId);
      });
    });
  });
}

// Add this helper function to check if a deliverable is completed:

function isDeliverableCompleted(deliverableId) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['deliverables'], (result) => {
      const deliverables = result.deliverables || [];
      const deliverable = deliverables.find(d => d.id === deliverableId);
      resolve(deliverable && deliverable.completed);
    });
  });
}

// Helper function to convert from a specific timezone to local time
function convertFromTimeZone(dateStr, timeStr, timeZone) {
  // Create a date string that includes the timezone
  const dateTimeStr = `${dateStr}T${timeStr}`;
  
  try {
    // Use Intl.DateTimeFormat to get the offset for the given timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Parse the original date in UTC
    const utcDate = new Date(dateTimeStr + 'Z');
    
    // Get the formatted parts in the target timezone
    const parts = formatter.formatToParts(utcDate);
    const getPart = (type) => parts.find(p => p.type === type)?.value;
    
    // Reconstruct the date in the target timezone
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');
    
    // Create a new date with these components in local time
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  } catch (e) {
    console.warn('Timezone conversion failed, using default parsing:', e);
    return new Date(dateTimeStr);
  }
}

// Parse meeting time with proper timezone handling - FIXED VERSION
function parseMeetingTime(timeObj) {
  let parsedTime;
  
  if (timeObj.dateTime) {
    // Meeting has specific time (not all-day)
    let dateTimeStr = timeObj.dateTime;
    
    // CRITICAL FIX: If the timeZone field is "UTC" but the datetime string 
    // doesn't have a Z, we need to add it so JavaScript parses it as UTC
    if (timeObj.timeZone === 'UTC' && !dateTimeStr.includes('Z') && !dateTimeStr.match(/[+-]\d{2}:\d{2}$/)) {
      // The time is in UTC but missing the Z indicator
      // Remove any trailing decimals first (the .0000000 part)
      dateTimeStr = dateTimeStr.replace(/\.\d+$/, '') + 'Z';
    }
    
    // Now parse the corrected datetime string
    parsedTime = new Date(dateTimeStr);
    
    // Handle other timezones if specified and not UTC
    if (timeObj.timeZone && timeObj.timeZone !== 'UTC' && !dateTimeStr.includes('Z') && !dateTimeStr.match(/[+-]\d{2}:\d{2}$/)) {
      // This is a time in a specific non-UTC timezone
      try {
        const dateStr = timeObj.dateTime.split('T')[0];
        const timeStr = timeObj.dateTime.split('T')[1].replace(/\.\d+$/, '');
        
        // Convert from the specified timezone to local
        parsedTime = convertFromTimeZone(dateStr, timeStr, timeObj.timeZone);
      } catch (e) {
        console.warn('Timezone conversion failed, using default parsing:', e);
      }
    }
  } else if (timeObj.date) {
    // All-day event
    parsedTime = new Date(timeObj.date + 'T00:00:00');
  } else {
    // Fallback
    parsedTime = new Date();
  }
  
  return parsedTime;
}

// Start auto-tracking check for meetings
function startAutoTrackingCheck() {
  // Check every 30 seconds for meetings that should auto-start
  autoTrackInterval = setInterval(checkForMeetingsToAutoTrack, 30000);
  // Also check immediately
  checkForMeetingsToAutoTrack();
}

// Check if any meetings should auto-start
async function checkForMeetingsToAutoTrack() {
  // Get auto-tracking settings
  chrome.storage.local.get(['autoTrackMeetings', 'todayMeetings', 'runningMeetingTimer', 'autoTrackSettings', 'endedMeetings'], (result) => {
    if (!result.autoTrackMeetings) return; // Feature disabled
    if (result.runningMeetingTimer) return; // Already tracking a meeting
    
    const meetings = result.todayMeetings || [];
    const endedMeetings = result.endedMeetings || [];
    const settings = result.autoTrackSettings || { gracePeriod: 2 };
    const now = new Date();
    
    // Find meetings that should be running now
    const eligibleMeetings = [];
    
    meetings.forEach(meeting => {
      const start = parseMeetingTime(meeting.start);
      const end = parseMeetingTime(meeting.end);
      
      // Check if meeting should be running now (with grace period)
      const gracePeriod = settings.gracePeriod * 60 * 1000; // Convert minutes to ms
      const shouldBeRunning = now >= new Date(start.getTime() - gracePeriod) && now < end;
      
      // Check if this meeting was already ended early
      const wasEndedEarly = endedMeetings.includes(meeting.id);
      
      if (shouldBeRunning && !meeting.autoTracked && !wasEndedEarly) {
        eligibleMeetings.push(meeting);
      }
    });
    
    // Handle overlapping meetings
    if (eligibleMeetings.length > 1) {
      showMeetingSelectionDialog(eligibleMeetings);
    } else if (eligibleMeetings.length === 1) {
      autoStartMeeting(eligibleMeetings[0]);
      
      // Mark as auto-tracked to prevent duplicate starts
      eligibleMeetings[0].autoTracked = true;
      chrome.storage.local.set({ todayMeetings: meetings });
    }
  });
}

// Show dialog to select which overlapping meeting to track
function showMeetingSelectionDialog(meetings) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 20px;
    max-width: 300px;
    width: 90%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  
  dialog.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: #323130; font-size: 16px;">
      Multiple Overlapping Meetings
    </h3>
    <p style="margin: 0 0 15px 0; color: #605e5c; font-size: 13px;">
      Which meeting are you attending?
    </p>
    <div id="meetingOptions" style="margin-bottom: 15px;">
      ${meetings.map((meeting, index) => {
        const start = parseMeetingTime(meeting.start);
        const end = parseMeetingTime(meeting.end);
        return `
        <button class="meeting-option-btn" data-index="${index}" style="
          width: 100%;
          padding: 10px;
          margin-bottom: 8px;
          border: 1px solid #d2d0ce;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          text-align: left;
          font-size: 13px;
          transition: all 0.2s;
        ">
          <strong>${meeting.subject}</strong><br>
          <small style="color: #605e5c;">
            ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
            ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </small>
        </button>
      `;
      }).join('')}
    </div>
    <button id="skipAutoTrack" style="
      width: 100%;
      padding: 8px;
      border: none;
      background: #605e5c;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    ">
      Skip Auto-Tracking
    </button>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Add hover effect
  dialog.querySelectorAll('.meeting-option-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#f3f2f1';
      btn.style.borderColor = '#0078d4';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'white';
      btn.style.borderColor = '#d2d0ce';
    });
  });
  
  // Handle meeting selection
  dialog.addEventListener('click', (e) => {
    if (e.target.classList.contains('meeting-option-btn')) {
      const index = parseInt(e.target.dataset.index);
      const selectedMeeting = meetings[index];
      
      // Mark all overlapping meetings as "checked" to prevent re-prompting
      chrome.storage.local.get(['todayMeetings'], (result) => {
        const allMeetings = result.todayMeetings || [];
        meetings.forEach(m => {
          const found = allMeetings.find(am => am.id === m.id);
          if (found) found.autoTracked = true;
        });
        chrome.storage.local.set({ todayMeetings: allMeetings });
      });
      
      autoStartMeeting(selectedMeeting);
      document.body.removeChild(overlay);
    } else if (e.target.id === 'skipAutoTrack') {
      // Mark all as checked without starting any
      chrome.storage.local.get(['todayMeetings'], (result) => {
        const allMeetings = result.todayMeetings || [];
        meetings.forEach(m => {
          const found = allMeetings.find(am => am.id === m.id);
          if (found) found.autoTracked = true;
        });
        chrome.storage.local.set({ todayMeetings: allMeetings });
      });
      document.body.removeChild(overlay);
    }
  });
}

// Auto-start a meeting
function autoStartMeeting(meeting) {
  const subject = meeting.subject || 'Scheduled Meeting';
  const end = parseMeetingTime(meeting.end);
  
  // Get notification setting
  chrome.storage.local.get(['autoTrackSettings'], (result) => {
    const settings = result.autoTrackSettings || { notifications: true };
    if (settings.notifications) {
      showNotification(`⏰ Auto-started: ${subject}`, 'info', 5000);
    }
  });
  
  // Store scheduled end time
  scheduledMeetingEndTime = end;
  currentMeetingId = meeting.id;
  
  // Start the meeting timer
  isInMeeting = true;
  meetingDescription = `[AUTO] ${subject}`;
  meetingStartTime = Date.now();
  meetingTimer = true;
  
  // Save meeting timer state with auto-track flag
  chrome.storage.local.set({
    runningMeetingTimer: {
      description: meetingDescription,
      startTimeStamp: meetingStartTime,
      scheduledEndTime: end.toISOString(),
      autoTracked: true,
      meetingId: meeting.id // Store meeting ID for reference
    }
  });
  
  // Update UI
  const meetingBtn = document.querySelector('.quick-task-btn[data-task="Meeting"]');
  if (meetingBtn) {
    meetingBtn.style.background = '#d83b01';
    meetingBtn.style.color = 'white';
    meetingBtn.innerHTML = '👥 Meeting (Auto)';
  }
  
  // Show meeting status with auto-track indicator
  const meetingStatus = document.getElementById('meetingStatus');
  if (meetingStatus) {
    meetingStatus.innerHTML = `
      <span>👥 Auto-tracking: ${subject}</span>
      <button id="stopAutoMeeting" style="margin-left: 10px; padding: 2px 8px; font-size: 11px; background: white; color: #d83b01; border: none; border-radius: 3px; cursor: pointer;">
        End Early
      </button>
    `;
    meetingStatus.classList.add('active');
    
    // Add event listener to stop button
    document.getElementById('stopAutoMeeting').addEventListener('click', () => {
      if (confirm('End this meeting early?')) {
        stopMeetingTimer(true); // true = ended early
      }
    });
  }
  
  updateMultitaskIndicator();
  
  // Set auto-end timer for scheduled end time if auto-end is enabled
  chrome.storage.local.get(['autoTrackSettings'], (result) => {
    const settings = result.autoTrackSettings || { autoEnd: true };
    if (settings.autoEnd) {
      const timeUntilEnd = end.getTime() - Date.now();
      
      if (timeUntilEnd > 0) {
        setTimeout(() => {
          // Check if meeting is still running and was auto-tracked
          chrome.storage.local.get(['runningMeetingTimer'], (result) => {
            if (result.runningMeetingTimer && result.runningMeetingTimer.autoTracked && 
                result.runningMeetingTimer.meetingId === meeting.id) {
              stopMeetingTimer(false); // false = ended on schedule
              const settings = result.autoTrackSettings || { notifications: true };
              if (settings.notifications) {
                showNotification(`⏰ Meeting ended: ${subject}`, 'info', 3000);
              }
            }
          });
        }, timeUntilEnd);
      }
    }
  });
}

// Check auth status for both providers
async function checkAuthStatus() {
  const providers = [];
  
  // Check Google connection
  try {
    if (googleCalendarService && await googleCalendarService.isConnected()) {
      const userInfo = await googleCalendarService.getUserInfo();
      providers.push('google');
      updateProviderUI('google', true, userInfo.email);
      
      // Store Google connection info
      chrome.storage.local.set({
        googleConnected: true,
        googleEmail: userInfo.email
      });
    } else {
      updateProviderUI('google', false);
    }
  } catch (error) {
    console.log('Google not connected:', error);
    updateProviderUI('google', false);
  }
  
  // Check Microsoft connection
  chrome.storage.local.get(['accessToken', 'userEmail', 'tokenExpiry', 'autoTrackMeetings'], (result) => {
    const authStatus = document.getElementById('authStatus');
    document.getElementById('mainContent').style.display = 'block';
    
    if (result.autoTrackMeetings) {
      console.log('Auto-tracking meetings is enabled');
    }
    
    if (result.accessToken && result.tokenExpiry) {
      const now = Date.now();
      const expiryTime = new Date(result.tokenExpiry).getTime();
      
      if (now < expiryTime) {
        providers.push('outlook');
        updateProviderUI('outlook', true, result.userEmail);
      } else {
        updateProviderUI('outlook', false);
      }
    } else {
      updateProviderUI('outlook', false);
    }
    
    // Update connected providers list
    connectedProviders = providers;
    
    // Show/hide calendar selector
    if (providers.length > 1) {
      document.getElementById('calendarSelector').style.display = 'flex';
      updateCalendarTabs();
    } else {
      document.getElementById('calendarSelector').style.display = 'none';
    }
    
    // Show meetings section if any calendar is connected
    if (providers.length > 0) {
      document.getElementById('meetingsSection').style.display = 'block';
      fetchTodayMeetings();
    } else {
      document.getElementById('meetingsSection').style.display = 'none';
    }
    
    // Update auth status display
    if (providers.length === 0) {
      authStatus.textContent = 'Not connected';
    } else if (providers.length === 1) {
      authStatus.textContent = providers[0] === 'google' ? 'Google' : 'Outlook';
    } else {
      authStatus.textContent = 'Universal';
    }
  });
}

// Update provider UI
function updateProviderUI(provider, connected, email = null) {
  const providerItem = document.getElementById(`${provider}Provider`);
  const emailElement = document.getElementById(`${provider}Email`);
  const statusElement = document.getElementById(`${provider}Status`);
  const connectBtn = document.getElementById(`${provider}ConnectBtn`);
  
  if (connected) {
    providerItem.classList.add('connected');
    emailElement.textContent = email;
    emailElement.style.display = 'block';
    statusElement.style.display = 'none';
    connectBtn.textContent = 'Disconnect';
    connectBtn.className = 'connect-btn disconnect';
  } else {
    providerItem.classList.remove('connected');
    emailElement.style.display = 'none';
    statusElement.style.display = 'block';
    statusElement.textContent = provider === 'outlook' ? 
      'Requires Azure setup' : 'One-click setup';
    connectBtn.textContent = 'Connect';
    connectBtn.className = 'connect-btn primary';
  }
}

// Update calendar tabs
function updateCalendarTabs() {
  document.querySelectorAll('.calendar-tab').forEach(tab => {
    tab.classList.remove('active');
    const provider = tab.dataset.provider;
    
    // Disable tabs for non-connected providers
    if (provider !== 'all' && !connectedProviders.includes(provider)) {
      tab.style.display = 'none';
    } else {
      tab.style.display = 'block';
      if (provider === activeCalendarProvider) {
        tab.classList.add('active');
      }
    }
  });
}

// Handle Google connection
async function connectGoogle() {
  const btn = document.getElementById('googleConnectBtn');
  const originalText = btn.textContent;
  
  try {
    btn.disabled = true;
    btn.textContent = 'Connecting...';
    
    if (originalText === 'Disconnect') {
      // Disconnect
      await googleCalendarService.signOut();
      chrome.storage.local.remove(['googleConnected', 'googleEmail']);
      updateProviderUI('google', false);
      await checkAuthStatus();
      showNotification('Disconnected from Google Calendar');
    } else {
      // Connect
      const userInfo = await googleCalendarService.connect();
      updateProviderUI('google', true, userInfo.email);
      await checkAuthStatus();
      showNotification('Connected to Google Calendar!', 'success');
    }
  } catch (error) {
    console.error('Google connection error:', error);
    showNotification('Failed to connect to Google: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText === 'Disconnect' ? 'Disconnect' : 'Connect';
  }
}

// Handle Outlook connection
async function connectOutlook() {
  const btn = document.getElementById('outlookConnectBtn');
  const originalText = btn.textContent;
  
  chrome.storage.local.get(['accessToken', 'clientId'], async (result) => {
    if (result.accessToken && btn.textContent === 'Disconnect') {
      // Disconnect
      chrome.runtime.sendMessage({ action: 'signOut' }, () => {
        updateProviderUI('outlook', false);
        checkAuthStatus();
        showNotification('Disconnected from Outlook');
      });
    } else {
      // Check if client ID is saved
      if (!result.clientId) {
        // No client ID saved, show setup instructions
        if (confirm('Outlook requires Azure app setup. You need to save your Client ID first.\n\nOpen settings to configure?')) {
          chrome.runtime.openOptionsPage();
        }
        return;
      }
      
      // Client ID is saved, proceed with authentication
      btn.disabled = true;
      btn.textContent = 'Connecting...';
      
      try {
        // Send authenticate message to background script
        chrome.runtime.sendMessage({ action: 'authenticate' }, (response) => {
          if (response && response.success) {
            updateProviderUI('outlook', true, response.userEmail);
            checkAuthStatus();
            showNotification('Connected to Outlook successfully!', 'success');
            // Refresh meetings list after connection
            fetchAndDisplayMeetings();
          } else {
            const errorMsg = response?.error || 'Authentication failed';
            showNotification(`Failed to connect: ${errorMsg}`, 'error');
            
            // If it's a client ID error, offer to open settings
            if (errorMsg.includes('Client ID')) {
              if (confirm('Client ID issue detected. Open settings to verify?')) {
                chrome.runtime.openOptionsPage();
              }
            }
          }
          
          btn.disabled = false;
          btn.textContent = originalText;
        });
      } catch (error) {
        console.error('Outlook connection error:', error);
        showNotification('Failed to connect to Outlook: ' + error.message, 'error');
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
  });
}

// Load categories for manual entry dropdown and quick actions
function loadCategories() {
  chrome.storage.local.get(['categories', 'quickActions', 'runningTimer', 'runningMeetingTimer'], (result) => {
    const categories = result.categories || [
      'Email', 'Meeting', 'Project Work', 'Admin', 
      'Break', 'Training', 'Planning', 'Other'
    ];
    
    // Update manual entry dropdown
    const select = document.getElementById('manualCategory');
    if (select) {
      select.innerHTML = categories.map(cat => 
        `<option value="${cat}">${cat}</option>`
      ).join('');
    }
    
    // Determine which categories to show as quick actions
    const quickActions = result.quickActions || categories.slice(0, 6);
    
    // Icons for common categories
    const icons = {
      'Email': '📧',
      'Meeting': '👥',
      'Project Work': '💻',
      'Break': '☕',
      'Admin': '📋',
      'Training': '📚',
      'Planning': '📅',
      'Other': '📝',
      'Phone Call': '📞',
      'Research': '🔍'
    };
    
    // Populate quick action buttons
    const grid = document.getElementById('quickTaskGrid');
    if (grid) {
      grid.innerHTML = quickActions.map(cat => {
        const icon = icons[cat] || '▶️';
        return `<button class="quick-task-btn" data-task="${cat}">${icon} ${cat}</button>`;
      }).join('');
    }
    
    // Re-attach event listeners to new buttons
    setupQuickTaskListeners();
    
    // Restore active button states
    if (result.runningTimer && result.runningTimer.task) {
      document.querySelectorAll('.quick-task-btn').forEach(btn => {
        if (btn.getAttribute('data-task') === result.runningTimer.task && result.runningTimer.task !== 'Meeting') {
          btn.style.background = '#0078d4';
          btn.style.color = 'white';
        }
      });
    }
    
    // Restore meeting button state
    if (result.runningMeetingTimer) {
      const meetingBtn = document.querySelector('.quick-task-btn[data-task="Meeting"]');
      if (meetingBtn) {
        meetingBtn.style.background = '#d83b01';
        meetingBtn.style.color = 'white';
        meetingBtn.innerHTML = result.runningMeetingTimer.autoTracked ? 
          '👥 Meeting (Auto)' : '👥 Meeting (Active)';
      }
    }
  });
}

// Load and display category totals
function loadCategoryTotals() {
  const { startDate, endDate } = getDateRange();
  
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    const categoryTotals = {};
    let totalMinutes = 0;
    
    Object.keys(timeEntries).forEach(date => {
      const entryDate = new Date(date);
      if (entryDate >= startDate && entryDate <= endDate) {
        const dayEntries = timeEntries[date] || [];
        
        dayEntries.forEach(entry => {
          // Skip scheduled entries that weren't tracked
          if (entry.scheduled && !entry.autoTracked) return;
          if (entry.fromCalendar) return;
          
          const category = entry.category || entry.type || 'Other';
          const minutes = Math.round(entry.duration / 60000);
          
          if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
          }
          categoryTotals[category] += minutes;
          totalMinutes += minutes;
        });
      }
    });
    
    displayCategoryTotals(categoryTotals, totalMinutes);
  });
}

// Display category totals
function displayCategoryTotals(categoryTotals, totalMinutes) {
  // Check if the section exists
  let totalsSection = document.getElementById('categoryTotalsSection');
  
  if (!totalsSection) {
    // Find where to insert it (after Time Entries section)
    const timeEntriesSection = document.querySelector('.section:has(#tasksList)');
    
    if (timeEntriesSection) {
      totalsSection = document.createElement('div');
      totalsSection.className = 'section';
      totalsSection.id = 'categoryTotalsSection';
      
      // Insert after time entries section
      timeEntriesSection.insertAdjacentElement('afterend', totalsSection);
    } else {
      return; // Can't find where to put it
    }
  }
  
  // Format time helper
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };
  
  // Sort categories by time spent
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);
  
  // Get date range text
  let dateRangeText = 'Today';
  switch(currentDateRange) {
    case 'yesterday': dateRangeText = 'Yesterday'; break;
    case 'week': dateRangeText = 'This Week'; break;
    case 'lastweek': dateRangeText = 'Last Week'; break;
    case 'month': dateRangeText = 'This Month'; break;
    case 'custom': dateRangeText = 'Custom Range'; break;
    case 'all': dateRangeText = 'All Time'; break;
  }
  
  // Build HTML with inline styles for immediate compatibility
  let html = `
    <div class="section-title">
      ${dateRangeText}'s Time by Category
      <span style="font-size: 11px; font-weight: normal; color: #605e5c;">
        Total: ${formatTime(totalMinutes)}
      </span>
    </div>
  `;
  
  if (sortedCategories.length === 0) {
    html += '<p style="text-align: center; color: #605e5c; padding: 10px;">No time tracked for this period</p>';
  } else {
    html += '<div class="category-totals-list">';
    
    sortedCategories.forEach(([category, minutes]) => {
      const percentage = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
      const width = percentage > 0 ? percentage : 1; // Minimum 1% width
      
      // Choose color based on category
      let barColor = '#0078d4'; // Default blue
      if (category === 'Meeting') barColor = '#d83b01';
      else if (category === 'Email') barColor = '#10893e';
      else if (category.includes('Project')) barColor = '#5c2d91';
      else if (category === 'Break') barColor = '#008272';
      else if (category === 'Admin') barColor = '#ca5010';
      else if (category === 'Training') barColor = '#8661c5';
      else if (category === 'Planning') barColor = '#00b7c3';
      
      html += `
        <div class="category-total-item">
          <div class="category-total-header">
            <span class="category-name">${category}</span>
            <span class="category-time" style="color: ${barColor};">${formatTime(minutes)}</span>
          </div>
          <div class="category-total-bar">
            <div class="category-total-fill" style="width: ${width}%; background: ${barColor};"></div>
          </div>
          <div class="category-percentage">${percentage}%</div>
        </div>
      `;
    });
    
    html += '</div>';
  }
  
  totalsSection.innerHTML = html;
}

// Check for running timers from storage (both meeting and task)
function checkForRunningTimers() {
  chrome.storage.local.get(['runningTimer', 'runningMeetingTimer'], (result) => {
    // Check for regular task timer
    if (result.runningTimer) {
      const { task, description, startTimeStamp, deliverableId } = result.runningTimer;
      const elapsed = Date.now() - startTimeStamp;
      
      if (elapsed < 24 * 60 * 60 * 1000) {
        currentTask = task;
        currentTaskDescription = description;
        currentDeliverable = deliverableId; // Restore deliverable
        startTime = startTimeStamp;
        currentTimer = true;
        
        // Update UI for task
        document.querySelectorAll('.quick-task-btn').forEach(btn => {
          if (btn.getAttribute('data-task') === task && task !== 'Meeting') {
            btn.style.background = '#0078d4';
            btn.style.color = 'white';
          }
        });
        
        // Update current tracking display
        updateCurrentTrackingDisplay();
      } else {
        chrome.storage.local.remove('runningTimer');
      }
    }
    
    // Check for meeting timer
    if (result.runningMeetingTimer) {
      const { description, startTimeStamp, scheduledEndTime, autoTracked, meetingId } = result.runningMeetingTimer;
      const elapsed = Date.now() - startTimeStamp;
      
      if (elapsed < 24 * 60 * 60 * 1000) {
        isInMeeting = true;
        meetingDescription = description;
        meetingStartTime = startTimeStamp;
        meetingTimer = true;
        currentMeetingId = meetingId;
        
        if (scheduledEndTime) {
          scheduledMeetingEndTime = new Date(scheduledEndTime);
        }
        
        // Update UI for meeting
        const meetingBtn = document.querySelector('.quick-task-btn[data-task="Meeting"]');
        if (meetingBtn) {
          meetingBtn.style.background = '#d83b01';
          meetingBtn.style.color = 'white';
          meetingBtn.innerHTML = autoTracked ? '👥 Meeting (Auto)' : '👥 Meeting (Active)';
        }
        
        // Show meeting status
        const meetingStatus = document.getElementById('meetingStatus');
        if (meetingStatus) {
          if (autoTracked) {
            const meetingName = description.replace('[AUTO] ', '');
            meetingStatus.innerHTML = `
              <span>👥 Auto-tracking: ${meetingName}</span>
              <button id="stopAutoMeeting" style="margin-left: 10px; padding: 2px 8px; font-size: 11px; background: white; color: #d83b01; border: none; border-radius: 3px; cursor: pointer;">
                End Early
              </button>
            `;
            
            // Add event listener after creating button
            setTimeout(() => {
              const stopBtn = document.getElementById('stopAutoMeeting');
              if (stopBtn) {
                stopBtn.addEventListener('click', () => {
                  if (confirm('End this meeting early?')) {
                    stopMeetingTimer(true);
                  }
                });
              }
            }, 100);
          } else {
            meetingStatus.innerHTML = '<span>👥 Currently in a meeting - You can start other tasks while meeting continues</span>';
          }
          meetingStatus.classList.add('active');
        }
        
        updateMultitaskIndicator();
      } else {
        chrome.storage.local.remove('runningMeetingTimer');
      }
    }
  });
}

// Update current tracking display
function updateCurrentTrackingDisplay() {
  const trackingDiv = document.getElementById('currentTracking');
  const taskNameSpan = document.getElementById('currentTaskName');
  const deliverableNameSpan = document.getElementById('currentDeliverableName');
  
  if (currentTimer || meetingTimer) {
    if (currentTimer) {
      taskNameSpan.textContent = currentTask + (currentTaskDescription ? ': ' + currentTaskDescription : '');
    } else {
      taskNameSpan.textContent = '-';
    }
    
    if (currentDeliverable) {
      chrome.storage.local.get(['deliverables'], (result) => {
        const deliverables = result.deliverables || [];
        const deliverable = deliverables.find(d => d.id === currentDeliverable);
        deliverableNameSpan.textContent = deliverable ? deliverable.name : 'Unknown';
      });
    } else {
      deliverableNameSpan.textContent = 'None';
    }
    
    trackingDiv.classList.add('active');
  } else {
    trackingDiv.classList.remove('active');
  }
}

// Update both timers
function updateTimers() {
  chrome.storage.local.get(['runningTimer', 'runningMeetingTimer'], (result) => {
    let displayText = '';
    
    // Meeting timer
    if (result.runningMeetingTimer) {
      const meetingElapsed = Date.now() - result.runningMeetingTimer.startTimeStamp;
      if (meetingElapsed < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(meetingElapsed / 3600000);
        const minutes = Math.floor((meetingElapsed % 3600000) / 60000);
        const seconds = Math.floor((meetingElapsed % 60000) / 1000);
        
        displayText = `👥 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Add scheduled end time if auto-tracked
        if (result.runningMeetingTimer.scheduledEndTime) {
          const endTime = new Date(result.runningMeetingTimer.scheduledEndTime);
          const remaining = endTime - Date.now();
          if (remaining > 0 && remaining < 5 * 60 * 1000) { // Show when less than 5 minutes remaining
            const minRemaining = Math.ceil(remaining / 60000);
            displayText += ` (${minRemaining}m left)`;
          }
        }
      }
    }
    
    // Task timer
    if (result.runningTimer) {
      const taskElapsed = Date.now() - result.runningTimer.startTimeStamp;
      if (taskElapsed < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(taskElapsed / 3600000);
        const minutes = Math.floor((taskElapsed % 3600000) / 60000);
        const seconds = Math.floor((taskElapsed % 60000) / 1000);
        
        const taskTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (displayText) {
          // Both timers running - show dual display
          displayText += ` | 💼 ${taskTime}`;
          updateDualTimerDisplay(result.runningMeetingTimer, result.runningTimer);
        } else {
          displayText = taskTime;
        }
      }
    }
    
    // Update display
    const timerDisplay = document.getElementById('timerDisplay');
    if (displayText) {
      const baseDisplay = displayText.split('<div')[0]; // Get just the time part
      timerDisplay.innerHTML = baseDisplay + timerDisplay.innerHTML.substring(timerDisplay.innerHTML.indexOf('<div'));
      
      // Add visual indicator for multi-tasking
      if (displayText.includes('|')) {
        timerDisplay.classList.add('multitasking');
      } else {
        timerDisplay.classList.remove('multitasking');
      }
    } else {
      timerDisplay.innerHTML = '00:00:00' + timerDisplay.innerHTML.substring(timerDisplay.innerHTML.indexOf('<div'));
      timerDisplay.classList.remove('multitasking');
    }
  });
}

// Update dual timer display
function updateDualTimerDisplay(meetingData, taskData) {
  const dualContainer = document.getElementById('dualTimerContainer');
  
  if (meetingData && taskData) {
    dualContainer.classList.add('active');
    
    // Update meeting time
    const meetingElapsed = Date.now() - meetingData.startTimeStamp;
    const meetingHours = Math.floor(meetingElapsed / 3600000);
    const meetingMinutes = Math.floor((meetingElapsed % 3600000) / 60000);
    const meetingSeconds = Math.floor((meetingElapsed % 60000) / 1000);
    document.getElementById('meetingTime').textContent = 
      `${meetingHours.toString().padStart(2, '0')}:${meetingMinutes.toString().padStart(2, '0')}:${meetingSeconds.toString().padStart(2, '0')}`;
    
    // Update task time
    const taskElapsed = Date.now() - taskData.startTimeStamp;
    const taskHours = Math.floor(taskElapsed / 3600000);
    const taskMinutes = Math.floor((taskElapsed % 3600000) / 60000);
    const taskSeconds = Math.floor((taskElapsed % 60000) / 1000);
    document.getElementById('taskTime').textContent = 
      `${taskHours.toString().padStart(2, '0')}:${taskMinutes.toString().padStart(2, '0')}:${taskSeconds.toString().padStart(2, '0')}`;
    
    document.getElementById('taskName').textContent = taskData.task;
  } else {
    dualContainer.classList.remove('active');
  }
}

// Update multi-task indicator
function updateMultitaskIndicator() {
  const indicator = document.getElementById('multitaskIndicator');
  if (isInMeeting && currentTimer) {
    indicator.classList.add('active');
  } else {
    indicator.classList.remove('active');
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('exportBtn').addEventListener('click', exportToExcel);
  document.getElementById('showManualEntryBtn').addEventListener('click', showManualEntry);
  document.getElementById('saveManualBtn').addEventListener('click', saveManualEntry);
  document.getElementById('cancelManualBtn').addEventListener('click', hideManualEntry);
  
  // Date range selector
  document.getElementById('dateRangeSelect').addEventListener('change', handleDateRangeChange);
  document.getElementById('applyDateRange').addEventListener('click', applyCustomDateRange);
  
  // Goals view link
  document.getElementById('viewGoalsBtn').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  
  // Manual entry form event listeners
  document.getElementById('manualCategory').addEventListener('change', function() {
    if (this.value === 'Other') {
      document.getElementById('manualDescription').placeholder = 'What type of task? (required)';
      document.getElementById('manualDescription').focus();
    } else {
      document.getElementById('manualDescription').placeholder = 'What did you work on? (optional)';
    }
  });
  
  // Deliverable selector
  document.getElementById('manualDeliverable').addEventListener('change', function() {
    const newDeliverableInput = document.getElementById('newDeliverableInput');
    if (this.value === '_new') {
      newDeliverableInput.classList.add('active');
      document.getElementById('newDeliverableName').focus();
    } else {
      newDeliverableInput.classList.remove('active');
      document.getElementById('newDeliverableName').value = '';
    }
  });
  
  // New deliverable creation
  document.getElementById('newDeliverableName').addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') {
      const name = this.value.trim();
      if (name) {
        const deliverableId = await createQuickDeliverable(name, document.getElementById('manualDeliverable'));
        document.getElementById('newDeliverableInput').classList.remove('active');
        this.value = '';
      }
    }
  });
  
  // Manual entry time selection - IMPROVED
  document.getElementById('manualWhen').addEventListener('change', function() {
    // Hide all conditional groups
    document.getElementById('minutesAgoGroup').style.display = 'none';
    document.getElementById('hoursAgoGroup').style.display = 'none';
    document.getElementById('specificTimeGroup').style.display = 'none';
    
    // Show relevant group
    switch(this.value) {
      case 'minutes-ago':
        document.getElementById('minutesAgoGroup').style.display = 'block';
        break;
      case 'hours-ago':
        document.getElementById('hoursAgoGroup').style.display = 'block';
        break;
      case 'specific-time':
        document.getElementById('specificTimeGroup').style.display = 'block';
        document.getElementById('specificDate').style.display = 'none';
        // Set default to current time
        const now = new Date();
        document.getElementById('specificEndTime').value = now.toTimeString().slice(0, 5);
        break;
      case 'specific-datetime':
        document.getElementById('specificTimeGroup').style.display = 'block';
        document.getElementById('specificDate').style.display = 'block';
        // Set defaults
        const today = new Date();
        document.getElementById('specificEndTime').value = today.toTimeString().slice(0, 5);
        document.getElementById('specificDate').value = today.toISOString().split('T')[0];
        break;
    }
  });
  
  // Multi-tasking checkbox
  document.getElementById('wasMultitasking').addEventListener('change', function() {
    document.getElementById('multitaskingDetails').style.display = 
      this.checked ? 'block' : 'none';
  });
  
  // Quick duration chips
  document.querySelectorAll('.duration-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.duration-chip').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      document.getElementById('manualDuration').value = this.dataset.minutes;
    });
  });
  
  // Event delegation for edit/delete buttons
  document.getElementById('tasksList').addEventListener('click', function(e) {
    if (e.target.classList.contains('edit-btn')) {
      const index = parseInt(e.target.getAttribute('data-index'));
      editTask(index);
    } else if (e.target.classList.contains('delete-btn')) {
      const index = parseInt(e.target.getAttribute('data-index'));
      deleteTask(index);
    }
  });
  
  // Quick action dialog event listeners
  document.getElementById('quickDeliverable').addEventListener('change', function() {
    const newDeliverableDiv = document.getElementById('quickNewDeliverable');
    if (this.value === '_new') {
      newDeliverableDiv.classList.add('active');
      document.getElementById('quickNewDeliverableName').focus();
    } else {
      newDeliverableDiv.classList.remove('active');
      document.getElementById('quickNewDeliverableName').value = '';
    }
  });
  
  document.getElementById('quickStartBtn').addEventListener('click', handleQuickStart);
  document.getElementById('quickCancelBtn').addEventListener('click', () => {
    document.getElementById('quickActionDialog').classList.remove('active');
    pendingQuickAction = null;
  });
  
  // Enter key to start from quick dialog
  document.getElementById('quickDescription').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuickStart();
  });
  
  document.getElementById('quickNewDeliverableName').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const name = e.target.value.trim();
      if (name) {
        await createQuickDeliverable(name, document.getElementById('quickDeliverable'));
        document.getElementById('quickNewDeliverable').classList.remove('active');
        e.target.value = '';
      }
    }
  });
}

// Setup quick task button listeners
function setupQuickTaskListeners() {
  document.querySelectorAll('.quick-task-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskType = e.target.getAttribute('data-task');
      
      // Special handling for Meeting button
      if (taskType === 'Meeting') {
        handleMeetingToggle();
        return;
      }
      
      // Regular task handling
      if (currentTimer && currentTask === taskType) {
        // Stop the current task
        stopTaskTimer();
      } else {
        // Show quick action dialog for task details
        showQuickActionDialog(taskType);
      }
    });
  });
}

// Show quick action dialog
function showQuickActionDialog(taskType) {
  const dialog = document.getElementById('quickActionDialog');
  const descriptionInput = document.getElementById('quickDescription');
  const deliverableSelect = document.getElementById('quickDeliverable');
  
  // Store pending action
  pendingQuickAction = { taskType };
  
  // Reset form
  descriptionInput.value = '';
  deliverableSelect.value = '';
  document.getElementById('quickNewDeliverable').classList.remove('active');
  document.getElementById('quickNewDeliverableName').value = '';
  
  // Set placeholder based on task type
  const placeholders = {
    'Project Work': 'What project are you working on?',
    'Email': 'Email subject or recipient',
    'Admin': 'What admin task?',
    'Planning': 'What are you planning?',
    'Training': 'What training/learning activity?',
    'Phone Call': 'Who are you calling?',
    'Research': 'What are you researching?',
    'Break': 'Taking a break...',
    'Other': 'What are you working on?'
  };
  
  descriptionInput.placeholder = placeholders[taskType] || 'What are you working on?';
  
  // Show dialog
  dialog.classList.add('active');
  
  // Focus on description for most tasks, but skip for Break
  if (taskType !== 'Break') {
    setTimeout(() => descriptionInput.focus(), 100);
  }
}

// Handle quick start
async function handleQuickStart() {
  if (!pendingQuickAction) return;
  
  const { taskType } = pendingQuickAction;
  const description = document.getElementById('quickDescription').value.trim();
  const deliverableSelect = document.getElementById('quickDeliverable');
  let deliverableId = deliverableSelect.value;
  
  // Handle new deliverable creation if needed
  if (deliverableId === '_new') {
    const newName = document.getElementById('quickNewDeliverableName').value.trim();
    if (newName) {
      deliverableId = await createQuickDeliverable(newName, deliverableSelect);
    } else {
      deliverableId = '';
    }
  }
  
  // Validation for "Other" category
  if (taskType === 'Other' && !description) {
    document.getElementById('quickDescription').placeholder = 'Description required for "Other" tasks';
    document.getElementById('quickDescription').focus();
    return;
  }
  
  // Stop current task timer if running (but keep meeting running)
  if (currentTimer) {
    stopTaskTimer();
  }
  
  // Start the new task
  startTaskTimer(taskType, description, deliverableId);
  
  // Hide dialog
  document.getElementById('quickActionDialog').classList.remove('active');
  pendingQuickAction = null;
}

// Setup calendar provider event listeners
function setupCalendarProviderListeners() {
  // Google connect/disconnect
  document.getElementById('googleConnectBtn').addEventListener('click', connectGoogle);
  
  // Outlook connect/disconnect
  document.getElementById('outlookConnectBtn').addEventListener('click', connectOutlook);
  
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Calendar tabs
  document.querySelectorAll('.calendar-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      activeCalendarProvider = e.currentTarget.dataset.provider;
      updateCalendarTabs();
      fetchTodayMeetings();
    });
  });
  
  // Update sync button to sync all connected calendars
  const syncBtn = document.getElementById('syncBtn');
  if (syncBtn) {
    // Remove any existing listeners first
    const newSyncBtn = syncBtn.cloneNode(true);
    syncBtn.parentNode.replaceChild(newSyncBtn, syncBtn);
    
    newSyncBtn.addEventListener('click', async () => {
      newSyncBtn.disabled = true;
      newSyncBtn.textContent = 'Syncing...';
      
      try {
        await fetchTodayMeetings();
        showNotification('Calendars synced successfully!', 'success');
      } catch (error) {
        showNotification('Sync failed: ' + error.message, 'error');
      } finally {
        newSyncBtn.disabled = false;
        newSyncBtn.textContent = 'Sync';
      }
    });
  }
}

// Handle meeting toggle
function handleMeetingToggle() {
  chrome.storage.local.get(['runningMeetingTimer'], (result) => {
    if (isInMeeting) {
      // Check if it's an auto-tracked meeting
      const isAutoTracked = result.runningMeetingTimer && result.runningMeetingTimer.autoTracked;
      const message = isAutoTracked ? 
        'End this auto-tracked meeting?' : 
        'End the current meeting?';
      
      if (confirm(message)) {
        stopMeetingTimer(true); // true = manual stop
      }
    } else {
      // Show quick action dialog for meeting
      showQuickActionDialog('Meeting');
      // Override the handler for meetings
      pendingQuickAction = { taskType: 'Meeting', isMeeting: true };
    }
  });
}

// Start meeting timer
function startMeetingTimer(description, deliverableId = null) {
  isInMeeting = true;
  meetingDescription = description;
  meetingStartTime = Date.now();
  meetingTimer = true;
  scheduledMeetingEndTime = null; // No scheduled end for manual meetings
  currentMeetingId = null; // No ID for manual meetings
  
  // Save meeting timer state
  chrome.storage.local.set({
    runningMeetingTimer: {
      description: description,
      startTimeStamp: meetingStartTime,
      autoTracked: false, // Manual start
      deliverableId: deliverableId
    }
  });
  
  // Update UI
  const meetingBtn = document.querySelector('.quick-task-btn[data-task="Meeting"]');
  if (meetingBtn) {
    meetingBtn.style.background = '#d83b01';
    meetingBtn.style.color = 'white';
    meetingBtn.innerHTML = '👥 Meeting (Active)';
  }
  
  // Show meeting status
  document.getElementById('meetingStatus').innerHTML = 
    '<span>👥 Currently in a meeting - You can start other tasks while meeting continues</span>';
  document.getElementById('meetingStatus').classList.add('active');
  updateMultitaskIndicator();
  
  showNotification('Meeting started' + (description ? `: ${description}` : ''));
  
  // Update goals progress after starting
  loadGoalsProgress();
}

// Stop meeting timer (endedEarly = true if manually stopped before scheduled end)
function stopMeetingTimer(endedEarly = false) {
  if (!meetingTimer) return;
  
  const duration = Date.now() - meetingStartTime;
  
  // Check if this was an auto-tracked meeting
  chrome.storage.local.get(['runningMeetingTimer', 'endedMeetings'], (result) => {
    const wasAutoTracked = result.runningMeetingTimer && result.runningMeetingTimer.autoTracked;
    const meetingId = result.runningMeetingTimer ? result.runningMeetingTimer.meetingId : null;
    const deliverableId = result.runningMeetingTimer ? result.runningMeetingTimer.deliverableId : null;
    
    // If ended early and has an ID, add to ended meetings list
    if (endedEarly && meetingId) {
      const endedMeetings = result.endedMeetings || [];
      if (!endedMeetings.includes(meetingId)) {
        endedMeetings.push(meetingId);
        // Store ended meetings for today only (clear at midnight)
        chrome.storage.local.set({ endedMeetings });
        
        // Set timeout to clear at midnight
        const now = new Date();
        const midnight = new Date(now);
        midnight.setDate(midnight.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);
        const msUntilMidnight = midnight - now;
        setTimeout(() => {
          chrome.storage.local.set({ endedMeetings: [] });
        }, msUntilMidnight);
      }
    }
    
    // Generate unique ID for this meeting entry
    const entryId = `meeting_${meetingStartTime}_${Date.now()}`;
    
    // Save meeting entry with multi-tasking flag
    const entry = {
      id: entryId,
      type: 'meeting',
      category: 'Meeting',
      description: meetingDescription || '',
      startTime: new Date(meetingStartTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: duration,
      date: new Date().toDateString(),
      wasMultitasking: currentTimer ? true : false,
      multitaskingWith: currentTask ? `${currentTask}${currentTaskDescription ? ': ' + currentTaskDescription : ''}` : null,
      autoTracked: wasAutoTracked,
      endedEarly: endedEarly && scheduledMeetingEndTime ? 
        (Date.now() < scheduledMeetingEndTime.getTime()) : false,
      deliverableId: deliverableId
    };
    
    // If ended early, note the difference
    if (entry.endedEarly && scheduledMeetingEndTime) {
      const scheduledDuration = scheduledMeetingEndTime.getTime() - meetingStartTime;
      const savedMinutes = Math.round((scheduledDuration - duration) / 60000);
      entry.description += ` [Ended ${savedMinutes}m early]`;
      showNotification(`Meeting ended ${savedMinutes} minutes early`, 'info', 3000);
    }
    
    saveTimeEntry(entry);
    
    // Clear meeting timer from storage
    chrome.storage.local.remove('runningMeetingTimer');
    
    // Reset meeting variables
    meetingTimer = null;
    meetingStartTime = null;
    meetingDescription = null;
    isInMeeting = false;
    scheduledMeetingEndTime = null;
    currentMeetingId = null;
    
    // Reset meeting UI
    const meetingBtn = document.querySelector('.quick-task-btn[data-task="Meeting"]');
    if (meetingBtn) {
      meetingBtn.style.background = '#e1dfdd';
      meetingBtn.style.color = 'inherit';
      meetingBtn.innerHTML = '👥 Meeting';
    }
    
    // Hide meeting status
    document.getElementById('meetingStatus').classList.remove('active');
    updateMultitaskIndicator();
    
    if (!wasAutoTracked || endedEarly) {
      showNotification('Meeting ended');
    }
    
    // Update goals progress after ending
    loadGoalsProgress();
  });
}

// Start task timer
function startTaskTimer(taskType, description = null, deliverableId = null) {
  currentTask = taskType;
  currentTaskDescription = description;
  currentDeliverable = deliverableId;
  startTime = Date.now();
  currentTimer = true;
  
  // Save timer state to storage
  chrome.storage.local.set({
    runningTimer: {
      task: taskType,
      description: description,
      startTimeStamp: startTime,
      deliverableId: deliverableId
    }
  });
  
  // Update UI
  document.querySelectorAll('.quick-task-btn').forEach(btn => {
    if (btn.getAttribute('data-task') === taskType && taskType !== 'Meeting') {
      btn.style.background = '#0078d4';
      btn.style.color = 'white';
    } else if (btn.getAttribute('data-task') !== 'Meeting') {
      btn.style.background = '#e1dfdd';
      btn.style.color = 'inherit';
    }
  });
  
  updateMultitaskIndicator();
  updateCurrentTrackingDisplay();
  showNotification(`Started: ${taskType}` + (description ? ` - ${description}` : ''));
  
  // Update goals progress after starting
  loadGoalsProgress();
}

// Stop task timer
function stopTaskTimer() {
  if (!currentTimer) return;
  
  const duration = Date.now() - startTime;
  
  // Generate unique ID for this task entry
  const entryId = `task_${startTime}_${Date.now()}`;
  
  // Save time entry with multi-tasking flag
  saveTimeEntry({
    id: entryId,
    type: 'task',
    category: currentTask,
    description: currentTaskDescription || '',
    startTime: new Date(startTime).toISOString(),
    endTime: new Date().toISOString(),
    duration: duration,
    date: new Date().toDateString(),
    wasMultitasking: isInMeeting ? true : false,
    multitaskingWith: isInMeeting ? `Meeting${meetingDescription ? ': ' + meetingDescription.replace('[AUTO] ', '') : ''}` : null,
    deliverableId: currentDeliverable
  });
  
  // Clear timer from storage
  chrome.storage.local.remove('runningTimer');
  
  // Reset task variables
  currentTimer = null;
  startTime = null;
  currentTask = null;
  currentTaskDescription = null;
  currentDeliverable = null;
  
  // Reset UI
  document.querySelectorAll('.quick-task-btn').forEach(btn => {
    if (btn.getAttribute('data-task') !== 'Meeting') {
      btn.style.background = '#e1dfdd';
      btn.style.color = 'inherit';
    }
  });
  
  updateMultitaskIndicator();
  updateCurrentTrackingDisplay();
  showNotification('Task completed');
  
  // Update goals progress after stopping
  loadGoalsProgress();
}

// Show notification with types
function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.getElementById('notification');
  if (notification) {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, duration);
  }
}

// Fetch today's meetings from both providers
async function fetchTodayMeetings() {
  const meetingsList = document.getElementById('meetingsList');
  meetingsList.innerHTML = '<div class="loading">Loading meetings...</div>';
  
  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const allMeetings = [];
  const errors = [];
  
  try {
    // Fetch from Google if connected and selected
    if (connectedProviders.includes('google') && 
        (activeCalendarProvider === 'all' || activeCalendarProvider === 'google')) {
      try {
        const googleEvents = await googleCalendarService.fetchEvents(
          today.toISOString(),
          tomorrow.toISOString()
        );
        allMeetings.push(...googleEvents);
      } catch (error) {
        console.error('Google Calendar fetch error:', error);
        errors.push({ provider: 'Google', error: error.message });
      }
    }
    
    // Fetch from Outlook if connected and selected
    if (connectedProviders.includes('outlook') && 
        (activeCalendarProvider === 'all' || activeCalendarProvider === 'outlook')) {
      try {
        const outlookEvents = await fetchOutlookEvents(today, tomorrow);
        allMeetings.push(...outlookEvents);
      } catch (error) {
        console.error('Outlook Calendar fetch error:', error);
        errors.push({ provider: 'Outlook', error: error.message });
      }
    }
    
    // Sort meetings by start time
    allMeetings.sort((a, b) => {
      const startA = parseMeetingTime(a.start);
      const startB = parseMeetingTime(b.start);
      return startA - startB;
    });
    
    // Remove duplicates (same title and time)
    const uniqueMeetings = removeDuplicateMeetings(allMeetings);
    
    // Display meetings
    displayUnifiedMeetings(uniqueMeetings);
    
    // Save for auto-tracking
    saveMeetingsForAutoTracking(uniqueMeetings);
    
    // Check if any meetings should be auto-started
    setTimeout(() => {
      checkForMeetingsInProgress(uniqueMeetings);
    }, 1000);
    
    // Show errors if any
    if (errors.length > 0) {
      const errorMsg = errors.map(e => `${e.provider}: ${e.error}`).join(', ');
      showNotification('Some calendars had errors', 'error', 5000);
    }
  } catch (error) {
    meetingsList.innerHTML = `<p style="color: #a80000;">Failed to load meetings: ${error.message}</p>`;
  }
}

// Fetch Outlook events (wrapper for existing functionality)
async function fetchOutlookEvents(startDate, endDate) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'fetchEvents',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }, (response) => {
      if (response && response.success) {
        const events = (response.events || []).map(event => ({
          ...event,
          provider: 'outlook'
        }));
        resolve(events);
      } else {
        reject(new Error(response ? response.error : 'Unknown error'));
      }
    });
  });
}

// Remove duplicate meetings
function removeDuplicateMeetings(meetings) {
  const seen = new Map();
  
  return meetings.filter(meeting => {
    const key = `${meeting.subject}-${meeting.start.dateTime}-${meeting.end.dateTime}`;
    if (seen.has(key)) {
      return false;
    }
    seen.set(key, true);
    return true;
  });
}


// Display unified meetings
function displayUnifiedMeetings(meetings) {
  const meetingsList = document.getElementById('meetingsList');
  
  if (!meetings || meetings.length === 0) {
    meetingsList.innerHTML = '<p style="text-align: center; color: #605e5c;">No meetings scheduled for today</p>';
    return;
  }
  
  meetingsList.innerHTML = meetings.map((meeting, index) => {
    const start = parseMeetingTime(meeting.start);
    const end = parseMeetingTime(meeting.end);
    const duration = Math.round((end - start) / 60000);
    
    const startTimeStr = start.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
    
    const endTimeStr = end.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
    
    // Provider indicator
    const providerIcon = meeting.provider === 'google' ? 
      '<svg width="14" height="14" class="provider-indicator"><path fill="#4285F4" d="M11 1.5H10V0H9v1.5H5V0H4v1.5H3c-.83 0-1.5.68-1.5 1.5v8c0 .83.68 1.5 1.5 1.5h8c.83 0 1.5-.68 1.5-1.5V3c0-.83-.68-1.5-1.5-1.5zm0 9.5H3V5h8v6zM5 6.5h2v2H5z"/></svg>' :
      '<svg width="14" height="14" class="provider-indicator"><path fill="#0078D4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.34 0-8-3.66-8-8s3.66-8 8-8 8 3.66 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47.65.89 1.77 1.47 2.96 1.47 1.97 0 3.5-1.6 3.5-3.57V12c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>';
    
    // Handle location - Outlook returns an object with displayName, Google returns a string
    let locationText = '';
    if (meeting.location) {
      if (typeof meeting.location === 'string') {
        locationText = meeting.location;
      } else if (meeting.location.displayName) {
        locationText = meeting.location.displayName;
      }
    }
    
    return `
      <div class="meeting-item" data-provider="${meeting.provider}">
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">
            ${providerIcon} ${meeting.subject}
          </div>
          <div style="font-size: 12px; color: #605e5c;">
            ${startTimeStr} - ${endTimeStr}
            (${duration} min)
            ${locationText ? ` • ${locationText}` : ''}
          </div>
        </div>
        <button class="button track-meeting-btn" data-index="${index}" style="font-size: 12px; padding: 4px 12px;">
          Track
        </button>
      </div>
    `;
  }).join('');
  
  setupMeetingTrackButtons();
}

// Save meetings for auto-tracking
function saveMeetingsForAutoTracking(meetings) {
  chrome.storage.local.set({ 
    todayMeetings: meetings,
    lastSyncTime: new Date().toISOString()
  });
}

// Check if any meetings are currently in progress after sync
function checkForMeetingsInProgress(meetings) {
  chrome.storage.local.get(['autoTrackMeetings', 'runningMeetingTimer', 'autoTrackSettings', 'endedMeetings'], (result) => {
    if (!result.autoTrackMeetings) return; // Feature disabled
    if (result.runningMeetingTimer) return; // Already tracking a meeting
    
    const settings = result.autoTrackSettings || { gracePeriod: 2 };
    const endedMeetings = result.endedMeetings || [];
    const now = new Date();
    const eligibleMeetings = [];
    
    meetings.forEach(meeting => {
      const start = parseMeetingTime(meeting.start);
      const end = parseMeetingTime(meeting.end);
      
      // Check if meeting should be running now (with grace period)
      const gracePeriod = settings.gracePeriod * 60 * 1000; // Convert minutes to ms
      const shouldBeRunning = now >= new Date(start.getTime() - gracePeriod) && now < end;
      
      // Check if already ended early
      const wasEndedEarly = endedMeetings.includes(meeting.id);
      
      if (shouldBeRunning && !wasEndedEarly) {
        eligibleMeetings.push(meeting);
      }
    });
    
    // Handle overlapping meetings
    if (eligibleMeetings.length > 1) {
      showMeetingSelectionDialog(eligibleMeetings);
    } else if (eligibleMeetings.length === 1) {
      autoStartMeeting(eligibleMeetings[0]);
    }
  });
}

// Setup meeting track button listeners
function setupMeetingTrackButtons() {
  document.querySelectorAll('.track-meeting-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const index = parseInt(this.dataset.index);
      trackMeeting(index);
    });
  });
}

// Track meeting from calendar
function trackMeeting(index) {
  chrome.storage.local.get(['todayMeetings', 'runningMeetingTimer'], (result) => {
    const meetings = result.todayMeetings || [];
    if (meetings[index]) {
      const meeting = meetings[index];
      const description = meeting.subject;
      
      // Check if there's actually a running meeting timer
      if (result.runningMeetingTimer) {
        if (confirm('End current meeting and start tracking this one?')) {
          stopMeetingTimer();
          startMeetingTimer(description);
        }
      } else {
        // No active meeting timer, just start tracking
        startMeetingTimer(description);
      }
    }
  });
}

// Initialize date inputs
function initializeDateInputs() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('startDate').value = today;
  document.getElementById('endDate').value = today;
}

// Handle date range change
function handleDateRangeChange(e) {
  currentDateRange = e.target.value;
  
  if (currentDateRange === 'custom') {
    document.getElementById('customDateRange').style.display = 'flex';
  } else {
    document.getElementById('customDateRange').style.display = 'none';
    loadDataForDateRange();
  }
}

// Apply custom date range
function applyCustomDateRange() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
  if (!startDate || !endDate) {
    alert('Please select both start and end dates');
    return;
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    alert('Start date must be before end date');
    return;
  }
  
  customStartDate = startDate;
  customEndDate = endDate;
  loadDataForDateRange();
}

// Get date range
function getDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let startDate, endDate;
  
  switch (currentDateRange) {
    case 'today':
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case 'yesterday':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 1);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case 'week':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay());
      endDate = new Date(today);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case 'lastweek':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay() - 7);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case 'custom':
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case 'all':
      startDate = new Date(2000, 0, 1);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    default:
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
  }
  
  return { startDate, endDate };
}

// Load data for date range
function loadDataForDateRange() {
  chrome.storage.local.get(['timeEntries', 'deliverables'], (result) => {
    const { startDate, endDate } = getDateRange();
    const timeEntries = result.timeEntries || {};
    const deliverables = result.deliverables || [];
    const tasksList = document.getElementById('tasksList');
    
    // Filter entries based on date range
    const filteredEntries = [];
    let totalHours = 0;
    let multitaskHours = 0;
    
    Object.keys(timeEntries).forEach(date => {
      const entryDate = new Date(date);
      if (entryDate >= startDate && entryDate <= endDate) {
        const dayEntries = timeEntries[date];
        dayEntries.forEach(entry => {
          // Only include actual tracked time, not scheduled meetings
          if (!entry.scheduled && !entry.fromCalendar) {
            const hours = entry.duration / 3600000;
            totalHours += hours;
            if (entry.wasMultitasking) {
              multitaskHours += hours;
            }
            filteredEntries.push({ ...entry, date });
          }
        });
      }
    });
    
    // Update stats
    document.getElementById('totalHours').textContent = totalHours.toFixed(1);
    document.getElementById('multitaskHours').textContent = multitaskHours.toFixed(1);
    
    // Display entries
    if (filteredEntries.length === 0) {
      tasksList.innerHTML = '<p style="text-align: center; color: #605e5c; padding: 20px;">No time entries for selected period</p>';
    } else {
      // Sort by date and time (newest first)
      filteredEntries.sort((a, b) => new Date(b.endTime || b.startTime) - new Date(a.endTime || a.startTime));
      
      tasksList.innerHTML = filteredEntries.slice(0, 10).map((entry, index) => {
        const duration = entry.duration / 60000; // minutes
        const hours = Math.floor(duration / 60);
        const minutes = Math.round(duration % 60);
        
        // Find deliverable name if exists
        let deliverableName = '';
        if (entry.deliverableId) {
          const deliverable = deliverables.find(d => d.id === entry.deliverableId);
          deliverableName = deliverable ? deliverable.name : 'Unknown';
        }
        
        let badges = '';
        if (entry.wasMultitasking) badges += '<span class="multitask-tag">Multi-tasked</span>';
        if (entry.autoTracked) badges += '<span class="multitask-tag" style="background: #d1ecf1; color: #0c5460;">Auto-tracked</span>';
        if (entry.endedEarly) badges += '<span class="multitask-tag" style="background: #d4edda; color: #155724;">Ended early</span>';
        if (entry.provider) badges += `<span class="multitask-tag" style="background: ${entry.provider === 'google' ? '#4285F4' : '#0078D4'}; color: white;">${entry.provider}</span>`;
        if (deliverableName) badges += `<span class="deliverable-tag">📌 ${deliverableName}</span>`;
        
        return `
          <div class="task-item">
            <div class="task-info">
              <div class="task-type">${entry.category || entry.type}</div>
              <div class="task-description">
                ${entry.description || entry.subject || 'No description'}
                ${badges}
              </div>
              <div class="task-time">
                <span>${new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>${hours}h ${minutes}m</span>
              </div>
              ${deliverableName ? `<div class="task-deliverable">Deliverable: ${deliverableName}</div>` : ''}
            </div>
            <div class="task-actions">
              <button class="edit-btn" data-index="${index}">Edit</button>
              <button class="delete-btn" data-index="${index}">Delete</button>
            </div>
          </div>
        `;
      }).join('');
    }
    
    // Refresh category totals
    loadCategoryTotals();
    
    // Refresh goals progress
    loadGoalsProgress();
  });
}

// Show manual entry form with improved UI
function showManualEntry() {
  const form = document.getElementById('manualEntryForm');
  form.style.display = 'block';
  
  // Reset form to defaults
  document.getElementById('manualDescription').value = '';
  document.getElementById('manualDuration').value = '30';
  document.getElementById('manualWhen').value = 'just-now';
  document.getElementById('minutesAgo').value = '15';
  document.getElementById('hoursAgo').value = '1';
  document.getElementById('wasMultitasking').checked = false;
  document.getElementById('multitaskingWith').value = '';
  document.getElementById('multitaskingDetails').style.display = 'none';
  document.getElementById('manualDeliverable').value = '';
  document.getElementById('newDeliverableInput').classList.remove('active');
  document.getElementById('newDeliverableName').value = '';
  
  // Hide all conditional groups
  document.getElementById('minutesAgoGroup').style.display = 'none';
  document.getElementById('hoursAgoGroup').style.display = 'none';
  document.getElementById('specificTimeGroup').style.display = 'none';
  
  // Set default time to now
  const now = new Date();
  document.getElementById('specificEndTime').value = now.toTimeString().slice(0, 5);
  document.getElementById('specificDate').value = now.toISOString().split('T')[0];
  
  // Set the 30m chip as selected
  document.querySelectorAll('.duration-chip').forEach(c => c.classList.remove('selected'));
  document.querySelector('.duration-chip[data-minutes="30"]').classList.add('selected');
}

// Hide manual entry form
function hideManualEntry() {
  document.getElementById('manualEntryForm').style.display = 'none';
}

// Save manual entry with improved logic
async function saveManualEntry() {
  const category = document.getElementById('manualCategory').value;
  let description = document.getElementById('manualDescription').value;
  const duration = parseInt(document.getElementById('manualDuration').value) * 60000; // Convert to ms
  const when = document.getElementById('manualWhen').value;
  const wasMultitasking = document.getElementById('wasMultitasking').checked;
  const multitaskingWith = document.getElementById('multitaskingWith').value;
  let deliverableId = document.getElementById('manualDeliverable').value;
  
  // Handle new deliverable creation
  if (deliverableId === '_new') {
    const newName = document.getElementById('newDeliverableName').value.trim();
    if (newName) {
      deliverableId = await createQuickDeliverable(newName, document.getElementById('manualDeliverable'));
    } else {
      deliverableId = '';
    }
  }
  
  // Validation
  if (!duration || duration <= 0) {
    alert('Please enter a valid duration');
    return;
  }
  
  // If Other category and no description, require it
  if (category === 'Other' && !description) {
    alert('Please provide a description for "Other" tasks');
    document.getElementById('manualDescription').focus();
    return;
  }
  
  // Calculate end time based on selection
  let endTime = new Date();
  
  switch(when) {
    case 'just-now':
      // Task just finished
      endTime = new Date();
      break;
      
    case 'minutes-ago':
      // Task ended X minutes ago
      const minutesAgo = parseInt(document.getElementById('minutesAgo').value) || 15;
      endTime = new Date(Date.now() - (minutesAgo * 60 * 1000));
      break;
      
    case 'hours-ago':
      // Task ended X hours ago or at specific time
      const hoursAgoValue = document.getElementById('hoursAgo').value;
      if (hoursAgoValue === 'morning') {
        endTime.setHours(9, 0, 0, 0); // 9 AM today
      } else if (hoursAgoValue === 'lunch') {
        endTime.setHours(13, 0, 0, 0); // 1 PM today
      } else {
        const hoursAgo = parseInt(hoursAgoValue);
        endTime = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
      }
      break;
      
    case 'specific-time':
      // Specific time today
      const timeStr = document.getElementById('specificEndTime').value;
      if (!timeStr) {
        alert('Please select an end time');
        return;
      }
      const [hours, minutes] = timeStr.split(':').map(Number);
      endTime.setHours(hours, minutes, 0, 0);
      
      // If the time is in the future, assume it was yesterday
      if (endTime > new Date()) {
        endTime.setDate(endTime.getDate() - 1);
      }
      break;
      
    case 'specific-datetime':
      // Specific date and time
      const dateStr = document.getElementById('specificDate').value;
      const timeStr2 = document.getElementById('specificEndTime').value;
      if (!dateStr || !timeStr2) {
        alert('Please select both date and time');
        return;
      }
      endTime = new Date(dateStr + 'T' + timeStr2);
      break;
  }
  
  // Calculate start time
  const startTime = new Date(endTime.getTime() - duration);
  
  // Validate times
  if (startTime > new Date()) {
    alert('Start time cannot be in the future');
    return;
  }
  
  if (endTime > new Date()) {
    alert('End time cannot be in the future');
    return;
  }
  
  // Check for overlaps with existing entries
  checkForOverlaps(startTime, endTime).then(hasOverlap => {
    if (hasOverlap) {
      if (!confirm('This entry overlaps with existing entries. Continue anyway?')) {
        return;
      }
    }
    
    // FIXED: Determine the type based on category and description
    const entryType = (category === 'Meeting' || 
                      (description && description.toLowerCase().includes('meeting'))) ? 'meeting' : 'task';
    
    // Generate unique ID
    const entryId = `manual_${startTime.getTime()}_${Date.now()}`;
    
    // Build multi-tasking description
    let multitaskingDescription = null;
    if (wasMultitasking && multitaskingWith) {
      multitaskingDescription = multitaskingWith;
      if (multitaskingWith === 'Other' && !description.includes('multi-tasking')) {
        description += ' (multi-tasking)';
      }
    }
    
    const entry = {
      id: entryId,
      type: entryType,
      category: category,
      description: description,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: duration,
      date: startTime.toDateString(),
      wasMultitasking: wasMultitasking,
      multitaskingWith: multitaskingDescription,
      manualEntry: true, // Flag to identify manual entries
      deliverableId: deliverableId
    };
    
    saveTimeEntry(entry);
    hideManualEntry();
    loadDataForDateRange();
    
    // Show success feedback
    const btn = document.getElementById('saveManualBtn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    btn.style.background = '#107c10';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);
  });
}

// Helper function to check for overlapping entries
async function checkForOverlaps(startTime, endTime) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['timeEntries'], (result) => {
      const timeEntries = result.timeEntries || {};
      const dateKey = startTime.toDateString();
      const entries = timeEntries[dateKey] || [];
      
      const hasOverlap = entries.some(entry => {
        const entryStart = new Date(entry.startTime);
        const entryEnd = new Date(entry.endTime);
        
        // Check if times overlap
        return (startTime < entryEnd && endTime > entryStart);
      });
      
      resolve(hasOverlap);
    });
  });
}

// Save time entry
function saveTimeEntry(entry) {
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    const entryDate = entry.date || new Date().toDateString();
    
    if (!timeEntries[entryDate]) {
      timeEntries[entryDate] = [];
    }
    
    timeEntries[entryDate].push(entry);
    chrome.storage.local.set({ timeEntries }, () => {
      loadDataForDateRange();
      loadCategoryTotals(); // Refresh category totals
      loadGoalsProgress(); // Refresh goals progress
    });
  });
}

// Edit task with full edit dialog
function editTask(index) {
  const { startDate, endDate } = getDateRange();
  
  chrome.storage.local.get(['timeEntries', 'categories', 'deliverables'], (result) => {
    const timeEntries = result.timeEntries || {};
    const categories = result.categories || [
      'Email', 'Meeting', 'Project Work', 'Admin', 
      'Break', 'Training', 'Planning', 'Other'
    ];
    const deliverables = result.deliverables || [];
    const allEntries = [];
    
    // Collect all entries in date range
    Object.keys(timeEntries).forEach(date => {
      const entryDate = new Date(date);
      if (entryDate >= startDate && entryDate <= endDate) {
        timeEntries[date].forEach(entry => {
          if (!entry.scheduled && !entry.fromCalendar) {
            allEntries.push({ entry, date });
          }
        });
      }
    });
    
    allEntries.sort((a, b) => new Date(b.entry.endTime || b.entry.startTime) - new Date(a.entry.endTime || a.entry.startTime));
    
    if (allEntries[index]) {
      const { entry, date } = allEntries[index];
      showEditDialog(entry, date, categories, deliverables);
    }
  });
}

// Show comprehensive edit dialog with smart multi-tasking selection
function showEditDialog(entry, entryDate, categories, deliverables) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'edit-dialog-overlay';
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'edit-dialog';
  
  // Format dates and times for inputs
  const startDateTime = new Date(entry.startTime);
  const endDateTime = new Date(entry.endTime);
  const duration = Math.round(entry.duration / 60000); // minutes
  
  // Build deliverables options
  let deliverablesOptions = '<option value="">No deliverable</option>';
  deliverables.forEach(d => {
    deliverablesOptions += `<option value="${d.id}" ${d.id === entry.deliverableId ? 'selected' : ''}>${d.name}</option>`;
  });
  
  dialog.innerHTML = `
    <h3>Edit Time Entry</h3>
    
    <div class="edit-form-group">
      <label>Category:</label>
      <select id="editCategory">
        ${categories.map(cat => 
          `<option value="${cat}" ${cat === entry.category ? 'selected' : ''}>${cat}</option>`
        ).join('')}
      </select>
    </div>
    
    <div class="edit-form-group">
      <label>Description:</label>
      <input type="text" id="editDescription" value="${entry.description || ''}">
    </div>
    
    <div class="edit-form-group">
      <label>Deliverable:</label>
      <select id="editDeliverable">
        ${deliverablesOptions}
      </select>
    </div>
    
    <div class="edit-form-group">
      <label>Date:</label>
      <input type="date" id="editDate" value="${startDateTime.toISOString().split('T')[0]}">
    </div>
    
    <div class="time-input-grid">
      <div class="edit-form-group">
        <label>Start Time:</label>
        <input type="time" id="editStartTime" value="${startDateTime.toTimeString().slice(0, 5)}">
      </div>
      <div class="edit-form-group">
        <label>End Time:</label>
        <input type="time" id="editEndTime" value="${endDateTime.toTimeString().slice(0, 5)}">
      </div>
    </div>
    
    <div class="edit-form-group">
      <label>Duration (minutes): <span id="durationDisplay">${duration}</span></label>
      <input type="range" id="editDuration" min="1" max="480" value="${duration}">
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #605e5c;">
        <span>1 min</span>
        <span>8 hours</span>
      </div>
    </div>
    
    <div class="edit-multitask-section">
      <label>
        <input type="checkbox" id="editMultitasking" ${entry.wasMultitasking ? 'checked' : ''}>
        Was multi-tasking during this time
      </label>
      <div id="editMultitaskingDetails" style="display: ${entry.wasMultitasking ? 'block' : 'none'}; margin-top: 8px;">
        <label style="display: block; margin-bottom: 4px; color: #605e5c; font-size: 12px;">
          What else were you doing?
        </label>
        <select id="editMultitaskingWith">
          <option value="" disabled>Loading overlapping activities...</option>
        </select>
      </div>
    </div>
    
    <div class="edit-dialog-buttons">
      <button class="save-btn" id="saveEditBtn">Save Changes</button>
      <button class="cancel-btn" id="cancelEditBtn">Cancel</button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Function to find overlapping entries
  function findOverlappingEntries(currentStartTime, currentEndTime, currentEntryId) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['timeEntries'], (result) => {
        const timeEntries = result.timeEntries || {};
        const overlappingEntries = [];
        
        // Check all dates around the current entry
        const checkDates = [];
        const currentDate = new Date(currentStartTime);
        
        // Check current date and adjacent dates (for entries crossing midnight)
        for (let i = -1; i <= 1; i++) {
          const checkDate = new Date(currentDate);
          checkDate.setDate(checkDate.getDate() + i);
          checkDates.push(checkDate.toDateString());
        }
        
        checkDates.forEach(dateStr => {
          const entries = timeEntries[dateStr] || [];
          entries.forEach(otherEntry => {
            // Skip the current entry itself
            if (otherEntry.id === currentEntryId || 
                (otherEntry.startTime === entry.startTime && otherEntry.endTime === entry.endTime)) {
              return;
            }
            
            const otherStart = new Date(otherEntry.startTime);
            const otherEnd = new Date(otherEntry.endTime);
            
            // Check if times overlap
            if ((currentStartTime < otherEnd && currentEndTime > otherStart) ||
                (otherStart < currentEndTime && otherEnd > currentStartTime)) {
              overlappingEntries.push({
                id: otherEntry.id,
                category: otherEntry.category,
                description: otherEntry.description || '',
                type: otherEntry.type,
                startTime: otherStart,
                endTime: otherEnd
              });
            }
          });
        });
        
        // Sort by start time
        overlappingEntries.sort((a, b) => a.startTime - b.startTime);
        resolve(overlappingEntries);
      });
    });
  }
  
  // Function to update multi-tasking dropdown
  async function updateMultitaskingDropdown() {
    const date = document.getElementById('editDate').value;
    const startTime = document.getElementById('editStartTime').value;
    const endTime = document.getElementById('editEndTime').value;
    
    if (!date || !startTime || !endTime) return;
    
    const currentStart = new Date(`${date}T${startTime}`);
    let currentEnd = new Date(`${date}T${endTime}`);
    
    // Handle end time being next day
    if (currentEnd < currentStart) {
      currentEnd.setDate(currentEnd.getDate() + 1);
    }
    
    const overlappingEntries = await findOverlappingEntries(currentStart, currentEnd, entry.id);
    const dropdown = document.getElementById('editMultitaskingWith');
    
    // Build options HTML
    let optionsHTML = `<option value="" disabled ${!entry.multitaskingWith ? 'selected' : ''}>Select an overlapping activity...</option>`;
    
    if (overlappingEntries.length > 0) {
      optionsHTML += '<optgroup label="Overlapping Activities">';
      overlappingEntries.forEach(overlap => {
        const timeStr = `${overlap.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${overlap.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const displayText = `${overlap.category}${overlap.description ? ': ' + overlap.description : ''} (${timeStr})`;
        const value = `${overlap.category}${overlap.description ? ': ' + overlap.description : ''}`;
        const selected = entry.multitaskingWith === value ? 'selected' : '';
        optionsHTML += `<option value="${value}" ${selected}>${displayText}</option>`;
      });
      optionsHTML += '</optgroup>';
    }
    
    // Add generic options as fallback
    optionsHTML += '<optgroup label="Other Activities">';
    const genericOptions = [
      { value: 'Meeting', label: '👥 In a meeting' },
      { value: 'Email', label: '📧 Checking email' },
      { value: 'Slack/Chat', label: '💬 On Slack/Chat' },
      { value: 'Phone Call', label: '📞 On a call' },
      { value: 'Admin', label: '📋 Admin work' },
      { value: 'Other', label: 'Other task' }
    ];
    
    genericOptions.forEach(opt => {
      const selected = entry.multitaskingWith === opt.value ? 'selected' : '';
      optionsHTML += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
    });
    optionsHTML += '</optgroup>';
    
    dropdown.innerHTML = optionsHTML;
  }
  
  // Add event listeners
  const durationSlider = document.getElementById('editDuration');
  const durationDisplay = document.getElementById('durationDisplay');
  const startTimeInput = document.getElementById('editStartTime');
  const endTimeInput = document.getElementById('editEndTime');
  const dateInput = document.getElementById('editDate');
  
  // Update duration display when slider changes
  durationSlider.addEventListener('input', (e) => {
    const minutes = e.target.value;
    durationDisplay.textContent = minutes;
    
    // Update end time based on new duration
    const date = dateInput.value;
    const startTime = startTimeInput.value;
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + (minutes * 60000));
    endTimeInput.value = endDateTime.toTimeString().slice(0, 5);
    
    // Update multi-tasking dropdown if needed
    if (document.getElementById('editMultitasking').checked) {
      updateMultitaskingDropdown();
    }
  });
  
  // Update duration when times change
  function updateDurationFromTimes() {
    const date = dateInput.value;
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    
    if (startTime && endTime) {
      let startDateTime = new Date(`${date}T${startTime}`);
      let endDateTime = new Date(`${date}T${endTime}`);
      
      // Handle end time being next day
      if (endDateTime < startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }
      
      const durationMs = endDateTime - startDateTime;
      const durationMinutes = Math.round(durationMs / 60000);
      
      if (durationMinutes > 0 && durationMinutes <= 480) {
        durationSlider.value = durationMinutes;
        durationDisplay.textContent = durationMinutes;
      }
    }
    
    // Update multi-tasking dropdown if needed
    if (document.getElementById('editMultitasking').checked) {
      updateMultitaskingDropdown();
    }
  }
  
  startTimeInput.addEventListener('change', updateDurationFromTimes);
  endTimeInput.addEventListener('change', updateDurationFromTimes);
  dateInput.addEventListener('change', updateDurationFromTimes);
  
  // Multi-tasking checkbox
  document.getElementById('editMultitasking').addEventListener('change', (e) => {
    const detailsDiv = document.getElementById('editMultitaskingDetails');
    detailsDiv.style.display = e.target.checked ? 'block' : 'none';
    
    if (e.target.checked) {
      updateMultitaskingDropdown();
    }
  });
  
  // Initial load of multi-tasking options if already multi-tasking
  if (entry.wasMultitasking) {
    updateMultitaskingDropdown();
  }
  
  // Save button
  document.getElementById('saveEditBtn').addEventListener('click', () => {
    const updatedEntry = {
      ...entry,
      category: document.getElementById('editCategory').value,
      description: document.getElementById('editDescription').value,
      wasMultitasking: document.getElementById('editMultitasking').checked,
      multitaskingWith: document.getElementById('editMultitasking').checked ? 
        document.getElementById('editMultitaskingWith').value : null,
      deliverableId: document.getElementById('editDeliverable').value
    };
    
    // ADDED: Ensure type matches category
    if (updatedEntry.category === 'Meeting') {
      updatedEntry.type = 'meeting';
    } else if (updatedEntry.category !== 'Meeting' && updatedEntry.type === 'meeting') {
      // Changed from meeting to another category
      updatedEntry.type = 'task';
    }
    
    // Calculate new times
    const newDate = document.getElementById('editDate').value;
    const startTime = document.getElementById('editStartTime').value;
    const endTime = document.getElementById('editEndTime').value;
    
    let newStartDateTime = new Date(`${newDate}T${startTime}`);
    let newEndDateTime = new Date(`${newDate}T${endTime}`);
    
    // Handle end time being next day
    if (newEndDateTime < newStartDateTime) {
      newEndDateTime.setDate(newEndDateTime.getDate() + 1);
    }
    
    updatedEntry.startTime = newStartDateTime.toISOString();
    updatedEntry.endTime = newEndDateTime.toISOString();
    updatedEntry.duration = newEndDateTime - newStartDateTime;
    updatedEntry.date = newStartDateTime.toDateString();
    
    // Save the updated entry
    saveUpdatedEntry(entry, updatedEntry, entryDate);
    document.body.removeChild(overlay);
  });
  
  // Cancel button
  document.getElementById('cancelEditBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
}

// Save the updated entry
function saveUpdatedEntry(oldEntry, newEntry, originalDate) {
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    
    // Remove old entry
    if (timeEntries[originalDate]) {
      const index = timeEntries[originalDate].findIndex(e => 
        e.id === oldEntry.id || 
        (e.startTime === oldEntry.startTime && e.endTime === oldEntry.endTime)
      );
      
      if (index !== -1) {
        timeEntries[originalDate].splice(index, 1);
        
        // Remove date key if no entries left
        if (timeEntries[originalDate].length === 0) {
          delete timeEntries[originalDate];
        }
      }
    }
    
    // Add new entry to potentially new date
    const newDate = newEntry.date;
    if (!timeEntries[newDate]) {
      timeEntries[newDate] = [];
    }
    timeEntries[newDate].push(newEntry);
    
    // Save and refresh
    chrome.storage.local.set({ timeEntries }, () => {
      loadDataForDateRange();
      loadCategoryTotals();
      loadGoalsProgress();
      showNotification('Entry updated successfully');
    });
  });
}

// Delete task
function deleteTask(index) {
  if (!confirm('Delete this entry?')) return;
  
  const { startDate, endDate } = getDateRange();
  
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    const allEntries = [];
    
    Object.keys(timeEntries).forEach(date => {
      const entryDate = new Date(date);
      if (entryDate >= startDate && entryDate <= endDate) {
        timeEntries[date].forEach(entry => {
          if (!entry.scheduled && !entry.fromCalendar) {
            allEntries.push({ entry, date });
          }
        });
      }
    });
    
    allEntries.sort((a, b) => new Date(b.entry.endTime || b.entry.startTime) - new Date(a.entry.endTime || a.entry.startTime));
    
    if (allEntries[index]) {
      const { entry, date } = allEntries[index];
      const dateEntries = timeEntries[date];
      const entryIndex = dateEntries.indexOf(entry);
      if (entryIndex !== -1) {
        dateEntries.splice(entryIndex, 1);
        chrome.storage.local.set({ timeEntries }, () => {
          loadDataForDateRange();
          loadCategoryTotals();
          loadGoalsProgress();
        });
      }
    }
  });
}

// Export to Excel with deliverables and goals
async function exportToExcel() {
  chrome.storage.local.get(['timeEntries', 'multitaskingSettings', 'exportSettings', 'deliverables', 'goals'], async (result) => {
    const { startDate, endDate } = getDateRange();
    const timeEntries = result.timeEntries || {};
    const settings = result.multitaskingSettings || { productivityWeight: 50 };
    const exportSettings = result.exportSettings || {
      includeMultitaskAnalysis: true,
      includeSummarySheet: true
    };
    const deliverables = result.deliverables || [];
    const goals = result.goals || [];
    
    // Filter entries based on date range
    const filteredEntries = {};
    Object.keys(timeEntries).forEach(date => {
      const entryDate = new Date(date);
      if (entryDate >= startDate && entryDate <= endDate) {
        // Filter out scheduled entries that weren't tracked
        filteredEntries[date] = timeEntries[date].filter(entry => 
          !entry.scheduled && !entry.fromCalendar
        );
      }
    });
    
    if (Object.keys(filteredEntries).length === 0) {
      alert('No data to export for the selected date range');
      return;
    }
    
    // Prepare data with multi-tasking analysis
    const allEntries = [];
    const multiTaskingAnalysis = [];
    const multiTaskingPairs = [];
    const deliverableAnalysis = [];
    const goalAnalysis = [];
    const periodCompletions = [];
    
    // Track deliverable and goal totals
    const deliverableTotals = {};
    const goalTotals = {};
    
    Object.keys(filteredEntries).forEach(date => {
      const entries = filteredEntries[date];
      
      // Track multi-tasking stats for this day
      let totalMultitaskingTime = 0;
      let meetingMultitaskingTime = 0;
      let autoTrackedTime = 0;
      let timeSaved = 0;
      
      // Track multi-tasking pairs
      const dailyPairs = {};
      
      entries.forEach(entry => {
        const hours = entry.duration / 3600000;
        const totalMinutes = Math.round(entry.duration / 60000);
        const displayHours = Math.floor(hours);
        const displayMinutes = Math.round((hours - displayHours) * 60);
        const entryDate = new Date(entry.startTime);
        
        // Find deliverable and goal info
        let deliverableName = '';
        let goalName = '';
        let deliverableStatus = '';
        let goalStatus = '';
        let deliverableCompletedDate = '';
        let goalCompletedDate = '';
        
        if (entry.deliverableId) {
          const deliverable = deliverables.find(d => d.id === entry.deliverableId);
          if (deliverable) {
            deliverableName = deliverable.name;
            deliverableStatus = deliverable.completed ? 'Completed' : 'Active';
            deliverableCompletedDate = deliverable.completedAt ? new Date(deliverable.completedAt).toLocaleDateString() : '';
            
            // Track deliverable totals
            if (!deliverableTotals[deliverable.id]) {
              deliverableTotals[deliverable.id] = {
                name: deliverable.name,
                status: deliverableStatus,
                completedAt: deliverable.completedAt,
                totalHours: 0,
                entries: 0,
                firstEntry: entryDate,
                lastEntry: entryDate,
                hoursInPeriod: 0
              };
            }
            deliverableTotals[deliverable.id].totalHours += hours;
            deliverableTotals[deliverable.id].hoursInPeriod += hours;
            deliverableTotals[deliverable.id].entries++;
            
            // Update first and last entry dates
            if (entryDate < deliverableTotals[deliverable.id].firstEntry) {
              deliverableTotals[deliverable.id].firstEntry = entryDate;
            }
            if (entryDate > deliverableTotals[deliverable.id].lastEntry) {
              deliverableTotals[deliverable.id].lastEntry = entryDate;
            }
            
            // Find associated goal
            if (deliverable.goalId) {
              const goal = goals.find(g => g.id === deliverable.goalId);
              if (goal) {
                goalName = goal.name;
                goalStatus = goal.completed ? 'Completed' : 'Active';
                goalCompletedDate = goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : '';
                
                // Track goal totals
                if (!goalTotals[goal.id]) {
                  goalTotals[goal.id] = {
                    name: goal.name,
                    impact: goal.impact,
                    status: goalStatus,
                    completedAt: goal.completedAt,
                    dailyTarget: goal.dailyTarget,
                    totalHours: 0,
                    entries: 0,
                    firstEntry: entryDate,
                    lastEntry: entryDate,
                    hoursInPeriod: 0,
                    deliverables: new Set()
                  };
                }
                goalTotals[goal.id].totalHours += hours;
                goalTotals[goal.id].hoursInPeriod += hours;
                goalTotals[goal.id].entries++;
                goalTotals[goal.id].deliverables.add(deliverable.name);
                
                // Update first and last entry dates
                if (entryDate < goalTotals[goal.id].firstEntry) {
                  goalTotals[goal.id].firstEntry = entryDate;
                }
                if (entryDate > goalTotals[goal.id].lastEntry) {
                  goalTotals[goal.id].lastEntry = entryDate;
                }
              }
            }
          }
        }
        
        // Add to main entries sheet with both hours and minutes
        allEntries.push({
          'Entry ID': entry.id || `${entry.type}_${new Date(entry.startTime).getTime()}`,
          Date: date,
          Type: entry.type || 'task',
          Category: entry.category || entry.subject || 'Other',
          Description: entry.description || entry.subject || '',
          Deliverable: deliverableName,
          'Deliverable Status': deliverableStatus,
          'Deliverable Completed': deliverableCompletedDate,
          Goal: goalName,
          'Goal Status': goalStatus,
          'Goal Completed': goalCompletedDate,
          'Start Time': new Date(entry.startTime).toLocaleTimeString(),
          'End Time': new Date(entry.endTime).toLocaleTimeString(),
          'Duration (hours)': hours.toFixed(2),
          'Duration (h:m)': `${displayHours}h ${displayMinutes}m`,
          'Duration (minutes)': totalMinutes,
          'Multi-tasking': entry.wasMultitasking ? 'Yes' : 'No',
          'Multi-tasked With': entry.multitaskingWith || '',
          'Auto-tracked': entry.autoTracked ? 'Yes' : 'No',
          'Ended Early': entry.endedEarly ? 'Yes' : 'No',
          'Provider': entry.provider || 'Manual'
        });
        
        // Track multi-tasking time
        if (entry.wasMultitasking) {
          totalMultitaskingTime += hours;
          if (entry.type === 'meeting' || entry.multitaskingWith === 'Meeting') {
            meetingMultitaskingTime += hours;
          }
          
          // Track multi-tasking pairs
          if (entry.multitaskingWith) {
            const pairKey = `${entry.category} + ${entry.multitaskingWith}`;
            if (!dailyPairs[pairKey]) {
              dailyPairs[pairKey] = {
                date: date,
                task1: entry.category,
                task1Description: entry.description || '',
                task2: entry.multitaskingWith,
                totalTime: 0,
                occurrences: 0
              };
            }
            dailyPairs[pairKey].totalTime += hours;
            dailyPairs[pairKey].occurrences++;
          }
        }
        
        // Track auto-tracked time
        if (entry.autoTracked) {
          autoTrackedTime += hours;
        }
        
        // Calculate time saved from early endings
        if (entry.endedEarly && entry.description) {
          const match = entry.description.match(/\[Ended (\d+)m early\]/);
          if (match) {
            timeSaved += parseInt(match[1]);
          }
        }
      });
      
      // Add multi-tasking pairs to the list
      Object.values(dailyPairs).forEach(pair => {
        multiTaskingPairs.push({
          Date: pair.date,
          'Task 1': pair.task1,
          'Task 1 Description': pair.task1Description,
          'Task 2': pair.task2,
          'Total Hours': pair.totalTime.toFixed(2),
          'Occurrences': pair.occurrences
        });
      });
      
      // Add to multi-tasking analysis
      const totalHours = entries.reduce((sum, e) => sum + e.duration / 3600000, 0);
      const meetingHours = entries.filter(e => e.type === 'meeting' || e.category === 'Meeting')
        .reduce((sum, e) => sum + e.duration / 3600000, 0);
      
      multiTaskingAnalysis.push({
        Date: date,
        'Total Hours': totalHours.toFixed(2),
        'Meeting Hours': meetingHours.toFixed(2),
        'Multi-tasking Hours': totalMultitaskingTime.toFixed(2),
        'Meeting Multi-tasking Hours': meetingMultitaskingTime.toFixed(2),
        'Auto-tracked Hours': autoTrackedTime.toFixed(2),
        'Time Saved (minutes)': timeSaved,
        'Multi-tasking %': totalHours > 0 ? ((totalMultitaskingTime / totalHours) * 100).toFixed(1) + '%' : '0%',
        'Meeting Efficiency': meetingHours > 0 ? 
          ((meetingMultitaskingTime / meetingHours) * 100).toFixed(1) + '% multi-tasked' : 'N/A'
      });
    });
    
    // Create deliverable analysis for the period
    Object.values(deliverableTotals).forEach(deliverable => {
      const workDays = Math.ceil((deliverable.lastEntry - deliverable.firstEntry) / (1000 * 60 * 60 * 24)) + 1;
      
      deliverableAnalysis.push({
        'Deliverable': deliverable.name,
        'Status': deliverable.status,
        'Completed Date': deliverable.completedAt ? new Date(deliverable.completedAt).toLocaleDateString() : '',
        'Hours in Period': deliverable.hoursInPeriod.toFixed(2),
        'Sessions in Period': deliverable.entries,
        'First Work in Period': deliverable.firstEntry.toLocaleDateString(),
        'Last Work in Period': deliverable.lastEntry.toLocaleDateString(),
        'Work Days in Period': workDays,
        'Average per Session': (deliverable.hoursInPeriod / deliverable.entries).toFixed(2) + ' hours',
        'Average per Day': (deliverable.hoursInPeriod / workDays).toFixed(2) + ' hours'
      });
    });
    
    // Create goal analysis for the period
    Object.values(goalTotals).forEach(goal => {
      const workDays = Math.ceil((goal.lastEntry - goal.firstEntry) / (1000 * 60 * 60 * 24)) + 1;
      const dailyAverage = goal.hoursInPeriod / workDays;
      const targetAchievement = goal.dailyTarget > 0 ? 
        ((dailyAverage / goal.dailyTarget) * 100).toFixed(1) + '%' : 'N/A';
      
      goalAnalysis.push({
        'Goal': goal.name,
        'Impact': goal.impact,
        'Status': goal.status,
        'Completed Date': goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : '',
        'Hours in Period': goal.hoursInPeriod.toFixed(2),
        'Sessions in Period': goal.entries,
        'Work Days in Period': workDays,
        'Daily Target': goal.dailyTarget || 'None',
        'Daily Average': dailyAverage.toFixed(2),
        'Target Achievement': targetAchievement,
        'Deliverables Worked On': Array.from(goal.deliverables).join(', '),
        'Average per Session': (goal.hoursInPeriod / goal.entries).toFixed(2) + ' hours'
      });
    });
    
    // Track completions within the period
    const completionsInPeriod = {
      goals: goals.filter(g => {
        if (g.completedAt) {
          const completedDate = new Date(g.completedAt);
          return completedDate >= startDate && completedDate <= endDate;
        }
        return false;
      }),
      deliverables: deliverables.filter(d => {
        if (d.completedAt) {
          const completedDate = new Date(d.completedAt);
          return completedDate >= startDate && completedDate <= endDate;
        }
        return false;
      })
    };
    
    if (completionsInPeriod.goals.length > 0 || completionsInPeriod.deliverables.length > 0) {
      periodCompletions.push({
        'Type': 'Goals Completed in Period',
        'Count': completionsInPeriod.goals.length,
        'Names': completionsInPeriod.goals.map(g => g.name).join(', ') || 'None'
      });
      periodCompletions.push({
        'Type': 'Deliverables Completed in Period',
        'Count': completionsInPeriod.deliverables.length,
        'Names': completionsInPeriod.deliverables.map(d => d.name).join(', ') || 'None'
      });
    }
    
    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Always add detailed entries sheet
    const entriesSheet = XLSX.utils.json_to_sheet(allEntries);
    XLSX.utils.book_append_sheet(wb, entriesSheet, 'Time Entries');
    
    // Add deliverable analysis if there are deliverables
    if (deliverableAnalysis.length > 0) {
      const deliverableSheet = XLSX.utils.json_to_sheet(deliverableAnalysis);
      XLSX.utils.book_append_sheet(wb, deliverableSheet, 'Deliverable Analysis');
    }
    
    // Add goal analysis if there are goals
    if (goalAnalysis.length > 0) {
      const goalSheet = XLSX.utils.json_to_sheet(goalAnalysis);
      XLSX.utils.book_append_sheet(wb, goalSheet, 'Goal Analysis');
    }
    
    // Add period completions if any
    if (periodCompletions.length > 0) {
      const completionsSheet = XLSX.utils.json_to_sheet(periodCompletions);
      XLSX.utils.book_append_sheet(wb, completionsSheet, 'Period Completions');
    }
    
    // Add multi-tasking pairs sheet if there are pairs
    if (multiTaskingPairs.length > 0) {
      const pairsSheet = XLSX.utils.json_to_sheet(multiTaskingPairs);
      XLSX.utils.book_append_sheet(wb, pairsSheet, 'Multi-tasking Pairs');
    }
    
    // Conditionally add multi-tasking analysis sheet based on settings
    if (exportSettings.includeMultitaskAnalysis) {
      const analysisSheet = XLSX.utils.json_to_sheet(multiTaskingAnalysis);
      XLSX.utils.book_append_sheet(wb, analysisSheet, 'Multi-tasking Analysis');
    }
    
    // Conditionally add summary sheet based on settings
    if (exportSettings.includeSummarySheet) {
      const summary = calculateSummary(filteredEntries, settings.productivityWeight, deliverables, goals);
      const summarySheet = XLSX.utils.json_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    }
    
    // Generate filename
    const dateRangeStr = currentDateRange === 'custom' ? 
      `${customStartDate}_to_${customEndDate}` : currentDateRange;
    const filename = `TimeTracker_${dateRangeStr}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Write and download
    XLSX.writeFile(wb, filename);
  });
}

// Update the calculateSummary function to include completion info
function calculateSummary(timeEntries, productivityWeight = 50, deliverables, goals) {
  const summary = [];
  const categoryTotals = {};
  let totalMultitaskingHours = 0;
  let totalMeetingMultitaskingHours = 0;
  
  // Track deliverable and goal time by date
  const dailyDeliverables = {};
  const dailyGoals = {};
  
  Object.keys(timeEntries).forEach(date => {
    const entries = timeEntries[date];
    let dayTotal = 0;
    let dayMultitasking = 0;
    const dayCategoryTotals = {};
    const dayDeliverables = {};
    const dayGoals = {};
    
    entries.forEach(entry => {
      const category = entry.category || entry.subject || 'Other';
      const duration = entry.duration / 3600000;
      
      dayTotal += duration;
      dayCategoryTotals[category] = (dayCategoryTotals[category] || 0) + duration;
      categoryTotals[category] = (categoryTotals[category] || 0) + duration;
      
      if (entry.wasMultitasking) {
        dayMultitasking += duration;
        totalMultitaskingHours += duration;
        
        if (entry.type === 'meeting' || entry.multitaskingWith === 'Meeting') {
          totalMeetingMultitaskingHours += duration;
        }
      }
      
      // Track deliverable time
      if (entry.deliverableId) {
        const deliverable = deliverables.find(d => d.id === entry.deliverableId);
        if (deliverable) {
          dayDeliverables[deliverable.name] = (dayDeliverables[deliverable.name] || 0) + duration;
          
          // Track goal time
          if (deliverable.goalId) {
            const goal = goals.find(g => g.id === deliverable.goalId);
            if (goal) {
              dayGoals[goal.name] = (dayGoals[goal.name] || 0) + duration;
            }
          }
        }
      }
    });
    
    const taskEntries = entries.filter(e => e.type === 'task');
    const meetingEntries = entries.filter(e => e.type === 'meeting' || e.category === 'Meeting');
    
    // Get top deliverable and goal for the day
    const topDeliverable = Object.entries(dayDeliverables).sort((a, b) => b[1] - a[1])[0];
    const topGoal = Object.entries(dayGoals).sort((a, b) => b[1] - a[1])[0];
    
    // Check for completions on this day
    const completedToday = {
      goals: goals.filter(g => g.completedAt && new Date(g.completedAt).toDateString() === date),
      deliverables: deliverables.filter(d => d.completedAt && new Date(d.completedAt).toDateString() === date)
    };
    
    summary.push({
      Date: date,
      'Total Hours': dayTotal.toFixed(2),
      'Meeting Hours': meetingEntries.reduce((sum, e) => sum + e.duration / 3600000, 0).toFixed(2),
      'Task Hours': taskEntries.reduce((sum, e) => sum + e.duration / 3600000, 0).toFixed(2),
      'Multi-tasking Hours': dayMultitasking.toFixed(2),
      'Productivity Score': dayTotal > 0 ? 
        (100 - (dayMultitasking / dayTotal * productivityWeight)).toFixed(0) : '100',
      'Top Deliverable': topDeliverable ? `${topDeliverable[0]} (${topDeliverable[1].toFixed(1)}h)` : '-',
      'Top Goal': topGoal ? `${topGoal[0]} (${topGoal[1].toFixed(1)}h)` : '-',
      'Goals Completed': completedToday.goals.length,
      'Deliverables Completed': completedToday.deliverables.length,
      'Email Hours': (dayCategoryTotals['Email'] || 0).toFixed(2),
      'Project Work Hours': (dayCategoryTotals['Project Work'] || 0).toFixed(2),
      'Other Hours': Object.keys(dayCategoryTotals)
        .filter(k => !['Meeting', 'Email', 'Project Work'].includes(k))
        .reduce((sum, k) => sum + dayCategoryTotals[k], 0)
        .toFixed(2)
    });
  });
  
  return summary;
}