// Complete popup.js with Meeting Multi-tasking Support and Auto-Tracking
// Version 2.0.1 - Fixed auto-start on sync, overlapping meetings, manual entry time bug, and meeting cancel bug

let currentTimer = null;
let startTime = null;
let currentTask = null;
let currentTaskDescription = null;

// Meeting-specific variables for multi-tasking
let meetingTimer = null;
let meetingStartTime = null;
let meetingDescription = null;
let isInMeeting = false;
let scheduledMeetingEndTime = null; // Track scheduled end for auto-tracked meetings
let currentMeetingId = null; // Track current meeting ID to prevent duplicates

let currentDateRange = 'today';
let customStartDate = null;
let customEndDate = null;

// Auto-tracking check interval
let autoTrackInterval = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async function() {
  checkAuthStatus();
  setupEventListeners();
  loadCategories();
  initializeDateInputs();
  loadDataForDateRange();
  checkForRunningTimers();
  setInterval(updateTimers, 1000);
  
  // Start auto-tracking check
  startAutoTrackingCheck();
});

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
  chrome.storage.local.get(['autoTrackMeetings', 'todayMeetings', 'runningMeetingTimer', 'autoTrackSettings'], (result) => {
    if (!result.autoTrackMeetings) return; // Feature disabled
    if (result.runningMeetingTimer) return; // Already tracking a meeting
    
    const meetings = result.todayMeetings || [];
    const settings = result.autoTrackSettings || { gracePeriod: 2 };
    const now = new Date();
    
    // Find meetings that should be running now
    const eligibleMeetings = [];
    
    meetings.forEach(meeting => {
      const start = new Date(meeting.start.dateTime || meeting.start.date);
      const end = new Date(meeting.end.dateTime || meeting.end.date);
      
      // Check if meeting should be running now (with grace period)
      const gracePeriod = settings.gracePeriod * 60 * 1000; // Convert minutes to ms
      const shouldBeRunning = now >= new Date(start.getTime() - gracePeriod) && now < end;
      
      if (shouldBeRunning && !meeting.autoTracked) {
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
      ${meetings.map((meeting, index) => `
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
            ${new Date(meeting.start.dateTime || meeting.start.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
            ${new Date(meeting.end.dateTime || meeting.end.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </small>
        </button>
      `).join('')}
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
  const end = new Date(meeting.end.dateTime || meeting.end.date);
  
  // Get notification setting
  chrome.storage.local.get(['autoTrackSettings'], (result) => {
    const settings = result.autoTrackSettings || { notifications: true };
    if (settings.notifications) {
      showNotification(`⏰ Auto-started: ${subject}`, 5000);
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
                showNotification(`⏰ Meeting ended: ${subject}`, 3000);
              }
            }
          });
        }, timeUntilEnd);
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

// Check for running timers from storage (both meeting and task)
function checkForRunningTimers() {
  chrome.storage.local.get(['runningTimer', 'runningMeetingTimer'], (result) => {
    // Check for regular task timer
    if (result.runningTimer) {
      const { task, description, startTimeStamp } = result.runningTimer;
      const elapsed = Date.now() - startTimeStamp;
      
      if (elapsed < 24 * 60 * 60 * 1000) {
        currentTask = task;
        currentTaskDescription = description;
        startTime = startTimeStamp;
        currentTimer = true;
        
        // Update UI for task
        document.querySelectorAll('.quick-task-btn').forEach(btn => {
          if (btn.getAttribute('data-task') === task && task !== 'Meeting') {
            btn.style.background = '#0078d4';
            btn.style.color = 'white';
          }
        });
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
      timerDisplay.textContent = displayText;
      
      // Add visual indicator for multi-tasking
      if (displayText.includes('|')) {
        timerDisplay.classList.add('multitasking');
      } else {
        timerDisplay.classList.remove('multitasking');
      }
    } else {
      timerDisplay.textContent = '00:00:00';
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

// Check auth status
function checkAuthStatus() {
  chrome.storage.local.get(['accessToken', 'userEmail', 'tokenExpiry', 'autoTrackMeetings'], (result) => {
    const authStatus = document.getElementById('authStatus');
    const syncBtn = document.getElementById('syncBtn');
    const meetingsSection = document.getElementById('meetingsSection');
    
    document.getElementById('mainContent').style.display = 'block';
    
    // Show auto-tracking status
    if (result.autoTrackMeetings) {
      console.log('Auto-tracking meetings is enabled');
    }
    
    if (result.accessToken && result.tokenExpiry) {
      const now = Date.now();
      const expiryTime = new Date(result.tokenExpiry).getTime();
      
      if (now < expiryTime) {
        // Token is valid
        authStatus.textContent = result.userEmail || 'Connected';
        document.getElementById('loginSection').style.display = 'none';
        
        if (syncBtn) syncBtn.style.display = 'inline-block';
        if (meetingsSection) meetingsSection.style.display = 'block';
        
        // Auto-fetch meetings
        fetchTodayMeetings().catch(err => {
          console.error('Failed to fetch meetings:', err);
          document.getElementById('meetingsList').innerHTML = 
            '<p style="text-align: center; color: #605e5c;">Failed to load meetings. Please reconnect to Outlook.</p>';
        });
      } else {
        // Token is expired
        handleDisconnectedState();
      }
    } else {
      handleDisconnectedState();
    }
  });
}

// Handle disconnected state
function handleDisconnectedState() {
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('authStatus').textContent = 'Not connected';
  const syncBtn = document.getElementById('syncBtn');
  const meetingsSection = document.getElementById('meetingsSection');
  if (syncBtn) syncBtn.style.display = 'none';
  if (meetingsSection) meetingsSection.style.display = 'none';
  const meetingsList = document.getElementById('meetingsList');
  if (meetingsList) {
    meetingsList.innerHTML = '<p style="text-align: center; color: #605e5c;">Connect to Outlook to see your meetings</p>';
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('connectBtn').addEventListener('click', authenticate);
  document.getElementById('syncBtn').addEventListener('click', fetchTodayMeetings);
  document.getElementById('exportBtn').addEventListener('click', exportToExcel);
  document.getElementById('showManualEntryBtn').addEventListener('click', showManualEntry);
  document.getElementById('saveManualBtn').addEventListener('click', saveManualEntry);
  document.getElementById('cancelManualBtn').addEventListener('click', hideManualEntry);
  
  // Date range selector
  document.getElementById('dateRangeSelect').addEventListener('change', handleDateRangeChange);
  document.getElementById('applyDateRange').addEventListener('click', applyCustomDateRange);
  
  // Manual entry form event listeners
  document.getElementById('manualCategory').addEventListener('change', function() {
    if (this.value === 'Other') {
      document.getElementById('manualDescription').placeholder = 'What type of task? (required)';
      document.getElementById('manualDescription').focus();
    } else {
      document.getElementById('manualDescription').placeholder = 'What did you work on? (optional)';
    }
  });
  
  // Manual entry time selection
  document.getElementById('manualWhen').addEventListener('change', function() {
    if (this.value === 'custom') {
      document.getElementById('customTimeGroup').style.display = 'block';
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      document.getElementById('customDateTime').value = now.toISOString().slice(0, 16);
    } else {
      document.getElementById('customTimeGroup').style.display = 'none';
    }
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
        // Start new task (can run alongside meeting)
        let description = null;
        
        if (taskType === 'Other') {
          description = prompt('What type of task is this?');
          if (!description) return; // Required for "Other"
        } else if (taskType !== 'Break') {
          // Show optional prompt for all tasks except Break
          const promptText = {
            'Project Work': 'What project are you working on? (optional):',
            'Email': 'Email subject/recipient (optional):',
            'Admin': 'What admin task? (optional):',
            'Planning': 'What are you planning? (optional):',
            'Training': 'What training/learning activity? (optional):',
            'Phone Call': 'Who are you calling/what about? (optional):',
            'Research': 'What are you researching? (optional):'
          };
          // Use specific prompt if defined, otherwise generic
          const promptMessage = promptText[taskType] || `${taskType} details (optional):`;
          description = prompt(promptMessage);
        }
        // Break will skip the prompt entirely
        
        // Stop current task timer if running (but keep meeting running)
        if (currentTimer) {
          stopTaskTimer();
        }
        
        startTaskTimer(taskType, description);
      }
    });
  });
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
      // Enter meeting mode manually
      const description = prompt('Meeting topic/attendees (optional):');
      // Only start meeting if user didn't cancel (null means cancelled)
      if (description !== null) {
        startMeetingTimer(description || '');
      }
    }
  });
}

// Start meeting timer
function startMeetingTimer(description) {
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
      autoTracked: false // Manual start
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
}

// Stop meeting timer (endedEarly = true if manually stopped before scheduled end)
function stopMeetingTimer(endedEarly = false) {
  if (!meetingTimer) return;
  
  const duration = Date.now() - meetingStartTime;
  
  // Check if this was an auto-tracked meeting
  chrome.storage.local.get(['runningMeetingTimer'], (result) => {
    const wasAutoTracked = result.runningMeetingTimer && result.runningMeetingTimer.autoTracked;
    
    // Save meeting entry with multi-tasking flag
    const entry = {
      type: 'meeting',
      category: 'Meeting',
      description: meetingDescription || '',
      startTime: new Date(meetingStartTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: duration,
      date: new Date().toDateString(),
      wasMultitasking: currentTimer ? true : false,
      multitaskingWith: currentTask || null,
      autoTracked: wasAutoTracked,
      endedEarly: endedEarly && scheduledMeetingEndTime ? 
        (Date.now() < scheduledMeetingEndTime.getTime()) : false
    };
    
    // If ended early, note the difference
    if (entry.endedEarly && scheduledMeetingEndTime) {
      const scheduledDuration = scheduledMeetingEndTime.getTime() - meetingStartTime;
      const savedMinutes = Math.round((scheduledDuration - duration) / 60000);
      entry.description += ` [Ended ${savedMinutes}m early]`;
      showNotification(`Meeting ended ${savedMinutes} minutes early`, 3000);
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
  });
}

// Start task timer
function startTaskTimer(taskType, description = null) {
  currentTask = taskType;
  currentTaskDescription = description;
  startTime = Date.now();
  currentTimer = true;
  
  // Save timer state to storage
  chrome.storage.local.set({
    runningTimer: {
      task: taskType,
      description: description,
      startTimeStamp: startTime
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
  showNotification(`Started: ${taskType}` + (description ? ` - ${description}` : ''));
}

// Stop task timer
function stopTaskTimer() {
  if (!currentTimer) return;
  
  const duration = Date.now() - startTime;
  
  // Save time entry with multi-tasking flag
  saveTimeEntry({
    type: 'task',
    category: currentTask,
    description: currentTaskDescription || '',
    startTime: new Date(startTime).toISOString(),
    endTime: new Date().toISOString(),
    duration: duration,
    date: new Date().toDateString(),
    wasMultitasking: isInMeeting ? true : false,
    multitaskingWith: isInMeeting ? 'Meeting' : null
  });
  
  // Clear timer from storage
  chrome.storage.local.remove('runningTimer');
  
  // Reset task variables
  currentTimer = null;
  startTime = null;
  currentTask = null;
  currentTaskDescription = null;
  
  // Reset UI
  document.querySelectorAll('.quick-task-btn').forEach(btn => {
    if (btn.getAttribute('data-task') !== 'Meeting') {
      btn.style.background = '#e1dfdd';
      btn.style.color = 'inherit';
    }
  });
  
  updateMultitaskIndicator();
  showNotification('Task completed');
}

// Show notification (enhanced with duration parameter)
function showNotification(message, duration = 3000) {
  const notification = document.getElementById('notification');
  if (notification) {
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, duration);
  }
}

// Authenticate with Outlook
async function authenticate() {
  document.getElementById('connectBtn').disabled = true;
  document.getElementById('connectBtn').textContent = 'Connecting...';
  
  chrome.runtime.sendMessage({ action: 'authenticate' }, (response) => {
    if (response && response.success) {
      checkAuthStatus();
    } else {
      alert('Authentication failed: ' + (response ? response.error : 'Unknown error'));
      document.getElementById('connectBtn').disabled = false;
      document.getElementById('connectBtn').textContent = 'Connect to Outlook';
    }
  });
}

// Fetch today's meetings
async function fetchTodayMeetings() {
  const meetingsList = document.getElementById('meetingsList');
  meetingsList.innerHTML = '<div class="loading">Loading meetings...</div>';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'fetchEvents',
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString()
    }, (response) => {
      if (response && response.success) {
        displayMeetings(response.events);
        saveMeetings(response.events);
        
        // Check if any meetings should be auto-started immediately after sync
        setTimeout(() => {
          checkForMeetingsInProgress(response.events);
        }, 1000);
        
        resolve(response.events);
      } else {
        const error = response ? response.error : 'Unknown error';
        meetingsList.innerHTML = `<p style="color: #a80000;">Failed to load meetings: ${error}</p>`;
        reject(error);
      }
    });
  });
}

// Check if any meetings are currently in progress after sync
function checkForMeetingsInProgress(meetings) {
  chrome.storage.local.get(['autoTrackMeetings', 'runningMeetingTimer', 'autoTrackSettings'], (result) => {
    if (!result.autoTrackMeetings) return; // Feature disabled
    if (result.runningMeetingTimer) return; // Already tracking a meeting
    
    const settings = result.autoTrackSettings || { gracePeriod: 2 };
    const now = new Date();
    const eligibleMeetings = [];
    
    meetings.forEach(meeting => {
      const start = new Date(meeting.start.dateTime || meeting.start.date);
      const end = new Date(meeting.end.dateTime || meeting.end.date);
      
      // Check if meeting should be running now (with grace period)
      const gracePeriod = settings.gracePeriod * 60 * 1000; // Convert minutes to ms
      const shouldBeRunning = now >= new Date(start.getTime() - gracePeriod) && now < end;
      
      if (shouldBeRunning) {
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

// Display meetings
function displayMeetings(meetings) {
  const meetingsList = document.getElementById('meetingsList');
  
  if (!meetings || meetings.length === 0) {
    meetingsList.innerHTML = '<p style="text-align: center; color: #605e5c;">No meetings scheduled for today</p>';
    return;
  }
  
  meetingsList.innerHTML = meetings.map((meeting, index) => {
    const start = new Date(meeting.start.dateTime || meeting.start.date);
    const end = new Date(meeting.end.dateTime || meeting.end.date);
    const duration = (end - start) / 60000; // minutes
    
    return `
      <div class="meeting-item">
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">${meeting.subject}</div>
          <div style="font-size: 12px; color: #605e5c;">
            ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
            ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            (${duration} min)
          </div>
        </div>
        <button class="button track-meeting-btn" data-index="${index}" style="font-size: 12px; padding: 4px 12px;">
          Track
        </button>
      </div>
    `;
  }).join('');
  
  // Attach event listeners to track buttons using event delegation
  setupMeetingTrackButtons();
}

// Setup meeting track button listeners
function setupMeetingTrackButtons() {
  const meetingsList = document.getElementById('meetingsList');
  meetingsList.addEventListener('click', function(e) {
    if (e.target.classList.contains('track-meeting-btn')) {
      const index = parseInt(e.target.dataset.index);
      trackMeeting(index);
    }
  });
}

// Track meeting from calendar
function trackMeeting(index) {
  chrome.storage.local.get(['todayMeetings'], (result) => {
    const meetings = result.todayMeetings || [];
    if (meetings[index]) {
      const meeting = meetings[index];
      const description = meeting.subject;
      
      if (isInMeeting) {
        if (confirm('End current meeting and start tracking this one?')) {
          stopMeetingTimer();
          startMeetingTimer(description);
        }
      } else {
        startMeetingTimer(description);
      }
    }
  });
}

// Save meetings to storage
function saveMeetings(meetings) {
  chrome.storage.local.set({ todayMeetings: meetings });
  
  // Auto-add meetings to time entries (scheduled times only, not tracked)
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    const today = new Date().toDateString();
    
    if (!timeEntries[today]) {
      timeEntries[today] = [];
    }
    
    // Remove existing calendar meetings and add updated ones
    timeEntries[today] = timeEntries[today].filter(entry => !entry.fromCalendar);
    
    // Only add scheduled times for reference (actual tracking happens via auto-track or manual)
    const meetingEntries = meetings.map(meeting => {
      const start = new Date(meeting.start.dateTime || meeting.start.date);
      const end = new Date(meeting.end.dateTime || meeting.end.date);
      
      return {
        type: 'meeting',
        category: 'Meeting',
        subject: meeting.subject,
        description: `[Scheduled] ${meeting.subject}`,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration: end - start,
        date: today,
        fromCalendar: true,
        scheduled: true, // Mark as scheduled, not tracked
        id: meeting.id // Store meeting ID
      };
    });
    
    timeEntries[today].push(...meetingEntries);
    
    chrome.storage.local.set({ timeEntries }, () => {
      loadDataForDateRange();
    });
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
  chrome.storage.local.get(['timeEntries'], (result) => {
    const { startDate, endDate } = getDateRange();
    const timeEntries = result.timeEntries || {};
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
          // Skip scheduled entries that weren't actually tracked
          if (entry.scheduled && !entry.autoTracked) return;
          
          const hours = entry.duration / 3600000;
          totalHours += hours;
          if (entry.wasMultitasking) {
            multitaskHours += hours;
          }
          filteredEntries.push({ ...entry, date });
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
        
        let badges = '';
        if (entry.wasMultitasking) badges += '<span class="multitask-tag">Multi-tasked</span>';
        if (entry.autoTracked) badges += '<span class="multitask-tag" style="background: #d1ecf1; color: #0c5460;">Auto-tracked</span>';
        if (entry.endedEarly) badges += '<span class="multitask-tag" style="background: #d4edda; color: #155724;">Ended early</span>';
        
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
            </div>
            <div class="task-actions">
              <button class="edit-btn" data-index="${index}">Edit</button>
              <button class="delete-btn" data-index="${index}">Delete</button>
            </div>
          </div>
        `;
      }).join('');
    }
  });
}

// Show manual entry form
function showManualEntry() {
  document.getElementById('manualEntryForm').style.display = 'block';
  document.getElementById('manualDescription').value = '';
  document.getElementById('manualDuration').value = '30';
  document.getElementById('manualWhen').value = 'now';
  document.getElementById('customTimeGroup').style.display = 'none';
  document.getElementById('wasMultitasking').checked = false;
  
  // Set default custom time to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('customDateTime').value = now.toISOString().slice(0, 16);
}

// Hide manual entry form
function hideManualEntry() {
  document.getElementById('manualEntryForm').style.display = 'none';
}

// Save manual entry
function saveManualEntry() {
  const category = document.getElementById('manualCategory').value;
  let description = document.getElementById('manualDescription').value;
  const duration = parseInt(document.getElementById('manualDuration').value) * 60000; // Convert to ms
  const when = document.getElementById('manualWhen').value;
  const wasMultitasking = document.getElementById('wasMultitasking').checked;
  
  if (!duration || duration <= 0) {
    alert('Please enter a valid duration');
    return;
  }
  
  // If Other category and no description, prompt for it
  if (category === 'Other' && !description) {
    description = prompt('What type of task was this?');
    if (!description) {
      alert('Please provide a description for "Other" tasks');
      return;
    }
  }
  
  let endTime;
  
  if (when === 'custom') {
    const customTime = document.getElementById('customDateTime').value;
    if (!customTime) {
      alert('Please select a date and time');
      return;
    }
    endTime = new Date(customTime);
  } else if (when === 'earlier') {
    // Fixed: Set endTime to current time, then calculate the actual earlier time
    const now = new Date();
    // Generate a random time between 1-4 hours ago for "earlier today"
    const hoursAgo = Math.floor(Math.random() * 3) + 1; // 1-4 hours ago
    endTime = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));
  } else {
    endTime = new Date();
  }
  
  const startTime = new Date(endTime.getTime() - duration);
  
  // Determine the type based on category
  const entryType = (category === 'Meeting') ? 'meeting' : 'task';
  
  const entry = {
    type: entryType,
    category: category,
    description: description,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: duration,
    date: startTime.toDateString(),
    wasMultitasking: wasMultitasking,
    multitaskingWith: wasMultitasking ? 'Unknown' : null
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
    });
  });
}

// Edit task
function editTask(index) {
  const { startDate, endDate } = getDateRange();
  
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    const allEntries = [];
    
    Object.keys(timeEntries).forEach(date => {
      const entryDate = new Date(date);
      if (entryDate >= startDate && entryDate <= endDate) {
        timeEntries[date].forEach(entry => {
          if (!entry.scheduled || entry.autoTracked) {
            allEntries.push({ entry, date });
          }
        });
      }
    });
    
    allEntries.sort((a, b) => new Date(b.entry.endTime || b.entry.startTime) - new Date(a.entry.endTime || a.entry.startTime));
    
    if (allEntries[index]) {
      const { entry, date } = allEntries[index];
      const newDescription = prompt('Edit description:', entry.description || '');
      
      if (newDescription !== null) {
        const dateEntries = timeEntries[date];
        const entryIndex = dateEntries.indexOf(entry);
        if (entryIndex !== -1) {
          dateEntries[entryIndex].description = newDescription;
          chrome.storage.local.set({ timeEntries }, () => {
            loadDataForDateRange();
          });
        }
      }
    }
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
          if (!entry.scheduled || entry.autoTracked) {
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
        });
      }
    }
  });
}

// Export to Excel
async function exportToExcel() {
  chrome.storage.local.get(['timeEntries', 'multitaskingSettings'], async (result) => {
    const { startDate, endDate } = getDateRange();
    const timeEntries = result.timeEntries || {};
    const settings = result.multitaskingSettings || { productivityWeight: 50 };
    
    // Filter entries based on date range
    const filteredEntries = {};
    Object.keys(timeEntries).forEach(date => {
      const entryDate = new Date(date);
      if (entryDate >= startDate && entryDate <= endDate) {
        // Filter out scheduled entries that weren't tracked
        filteredEntries[date] = timeEntries[date].filter(entry => 
          !entry.scheduled || entry.autoTracked
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
    
    Object.keys(filteredEntries).forEach(date => {
      const entries = filteredEntries[date];
      
      // Track multi-tasking stats for this day
      let totalMultitaskingTime = 0;
      let meetingMultitaskingTime = 0;
      let autoTrackedTime = 0;
      let timeSaved = 0;
      
      entries.forEach(entry => {
        const hours = entry.duration / 3600000;
        
        // Add to main entries sheet
        allEntries.push({
          Date: date,
          Type: entry.type || 'task',
          Category: entry.category || entry.subject || 'Other',
          Description: entry.description || entry.subject || '',
          'Start Time': new Date(entry.startTime).toLocaleTimeString(),
          'End Time': new Date(entry.endTime).toLocaleTimeString(),
          'Duration (hours)': hours.toFixed(2),
          'Multi-tasking': entry.wasMultitasking ? 'Yes' : 'No',
          'Multi-tasked With': entry.multitaskingWith || '',
          'Auto-tracked': entry.autoTracked ? 'Yes' : 'No',
          'Ended Early': entry.endedEarly ? 'Yes' : 'No'
        });
        
        // Track multi-tasking time
        if (entry.wasMultitasking) {
          totalMultitaskingTime += hours;
          if (entry.type === 'meeting' || entry.multitaskingWith === 'Meeting') {
            meetingMultitaskingTime += hours;
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
    
    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Add detailed entries sheet
    const entriesSheet = XLSX.utils.json_to_sheet(allEntries);
    XLSX.utils.book_append_sheet(wb, entriesSheet, 'Time Entries');
    
    // Add multi-tasking analysis sheet
    const analysisSheet = XLSX.utils.json_to_sheet(multiTaskingAnalysis);
    XLSX.utils.book_append_sheet(wb, analysisSheet, 'Multi-tasking Analysis');
    
    // Add summary sheet
    const summary = calculateSummary(filteredEntries, settings.productivityWeight);
    const summarySheet = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    
    // Generate filename
    const dateRangeStr = currentDateRange === 'custom' ? 
      `${customStartDate}_to_${customEndDate}` : currentDateRange;
    const filename = `TimeTracker_${dateRangeStr}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Write and download
    XLSX.writeFile(wb, filename);
  });
}

// Calculate summary
function calculateSummary(timeEntries, productivityWeight = 50) {
  const summary = [];
  const categoryTotals = {};
  let totalMultitaskingHours = 0;
  let totalMeetingMultitaskingHours = 0;
  
  Object.keys(timeEntries).forEach(date => {
    const entries = timeEntries[date];
    let dayTotal = 0;
    let dayMultitasking = 0;
    const dayCategoryTotals = {};
    
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
    });
    
    const taskEntries = entries.filter(e => e.type === 'task');
    const meetingEntries = entries.filter(e => e.type === 'meeting' || e.category === 'Meeting');
    
    summary.push({
      Date: date,
      'Total Hours': dayTotal.toFixed(2),
      'Meeting Hours': meetingEntries.reduce((sum, e) => sum + e.duration / 3600000, 0).toFixed(2),
      'Task Hours': taskEntries.reduce((sum, e) => sum + e.duration / 3600000, 0).toFixed(2),
      'Multi-tasking Hours': dayMultitasking.toFixed(2),
      'Productivity Score': dayTotal > 0 ? 
        (100 - (dayMultitasking / dayTotal * productivityWeight)).toFixed(0) : '100',
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