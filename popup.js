// Complete popup.js with Meeting Multi-tasking Support, Auto-Tracking, Enhanced Edit, and Fixed Export Settings
// Version 2.0.7 - Fixed export settings loading and application

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

let currentDateRange = 'today'; // Default, will be overridden by settings
let customStartDate = null;
let customEndDate = null;

// Auto-tracking check interval
let autoTrackInterval = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async function() {
  // Load export settings FIRST to set default date range
  chrome.storage.local.get(['exportSettings'], (result) => {
    const settings = result.exportSettings || { defaultDateRange: 'today' };
    currentDateRange = settings.defaultDateRange;
    document.getElementById('dateRangeSelect').value = currentDateRange;
    
    // Handle custom date range visibility
    if (currentDateRange === 'custom') {
      document.getElementById('customDateRange').style.display = 'flex';
    }
    
    // Load data for the selected date range
    loadDataForDateRange();
    loadCategoryTotals();
  });
  
  checkAuthStatus();
  setupEventListeners();
  loadCategories();
  initializeDateInputs();
  checkForRunningTimers();
  setInterval(updateTimers, 1000);
  setInterval(loadCategoryTotals, 30000); // Update category totals every 30 seconds
  
  // Start auto-tracking check
  startAutoTrackingCheck();
});

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
  chrome.storage.local.get(['runningMeetingTimer', 'endedMeetings'], (result) => {
    const wasAutoTracked = result.runningMeetingTimer && result.runningMeetingTimer.autoTracked;
    const meetingId = result.runningMeetingTimer ? result.runningMeetingTimer.meetingId : null;
    
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
    multitaskingWith: isInMeeting ? `Meeting${meetingDescription ? ': ' + meetingDescription.replace('[AUTO] ', '') : ''}` : null
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

// Fetch today's meetings with proper timezone handling
async function fetchTodayMeetings() {
  const meetingsList = document.getElementById('meetingsList');
  meetingsList.innerHTML = '<div class="loading">Loading meetings...</div>';
  
  // Get today's date range in local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Convert to UTC for API request
  // Microsoft Graph expects UTC ISO strings
  const startDateTime = today.toISOString();
  const endDateTime = tomorrow.toISOString();
  
  // Clear ended meetings list when fetching new meetings (new day)
  chrome.storage.local.get(['lastSyncDate'], (result) => {
    const lastSync = result.lastSyncDate;
    const todayStr = today.toDateString();
    if (lastSync !== todayStr) {
      chrome.storage.local.set({ 
        endedMeetings: [],
        lastSyncDate: todayStr
      });
    }
  });
  
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'fetchEvents',
      startDate: startDateTime,
      endDate: endDateTime
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

// Display meetings with proper timezone handling
function displayMeetings(meetings) {
  const meetingsList = document.getElementById('meetingsList');
  
  if (!meetings || meetings.length === 0) {
    meetingsList.innerHTML = '<p style="text-align: center; color: #605e5c;">No meetings scheduled for today</p>';
    return;
  }
  
  meetingsList.innerHTML = meetings.map((meeting, index) => {
    // Use the fixed parseMeetingTime function
    const start = parseMeetingTime(meeting.start);
    const end = parseMeetingTime(meeting.end);
    
    const duration = Math.round((end - start) / 60000); // minutes
    
    // Format times in local timezone
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
    
    return `
      <div class="meeting-item">
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">${meeting.subject}</div>
          <div style="font-size: 12px; color: #605e5c;">
            ${startTimeStr} - ${endTimeStr}
            (${duration} min)
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
      
      // Check if there's actually a running meeting timer (not just scheduled entries)
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

// Save meetings to storage (fixed to not interfere with tracking)
function saveMeetings(meetings) {
  // Only save the meeting list for display, don't add to timeEntries unless actually tracked
  chrome.storage.local.set({ todayMeetings: meetings });
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
    
    // Refresh category totals
    loadCategoryTotals();
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
function saveManualEntry() {
  const category = document.getElementById('manualCategory').value;
  let description = document.getElementById('manualDescription').value;
  const duration = parseInt(document.getElementById('manualDuration').value) * 60000; // Convert to ms
  const when = document.getElementById('manualWhen').value;
  const wasMultitasking = document.getElementById('wasMultitasking').checked;
  const multitaskingWith = document.getElementById('multitaskingWith').value;
  
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
    
    // Determine the type based on category
    const entryType = (category === 'Meeting') ? 'meeting' : 'task';
    
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
      manualEntry: true // Flag to identify manual entries
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
    });
  });
}

// Edit task with full edit dialog
function editTask(index) {
  const { startDate, endDate } = getDateRange();
  
  chrome.storage.local.get(['timeEntries', 'categories'], (result) => {
    const timeEntries = result.timeEntries || {};
    const categories = result.categories || [
      'Email', 'Meeting', 'Project Work', 'Admin', 
      'Break', 'Training', 'Planning', 'Other'
    ];
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
      showEditDialog(entry, date, categories);
    }
  });
}
// Enhanced showEditDialog function with smart multi-tasking selection
// Show comprehensive edit dialog with smart multi-tasking selection
function showEditDialog(entry, entryDate, categories) {
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
    max-width: 400px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  
  // Format dates and times for inputs
  const startDateTime = new Date(entry.startTime);
  const endDateTime = new Date(entry.endTime);
  const duration = Math.round(entry.duration / 60000); // minutes
  
  dialog.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: #323130; font-size: 16px;">
      Edit Time Entry
    </h3>
    
    <div style="margin-bottom: 12px;">
      <label style="display: block; margin-bottom: 4px; color: #605e5c; font-size: 13px;">
        Category:
      </label>
      <select id="editCategory" style="width: 100%; padding: 6px; border: 1px solid #d2d0ce; border-radius: 4px; font-size: 13px;">
        ${categories.map(cat => 
          `<option value="${cat}" ${cat === entry.category ? 'selected' : ''}>${cat}</option>`
        ).join('')}
      </select>
    </div>
    
    <div style="margin-bottom: 12px;">
      <label style="display: block; margin-bottom: 4px; color: #605e5c; font-size: 13px;">
        Description:
      </label>
      <input type="text" id="editDescription" value="${entry.description || ''}" 
        style="width: 100%; padding: 6px; border: 1px solid #d2d0ce; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
    </div>
    
    <div style="margin-bottom: 12px;">
      <label style="display: block; margin-bottom: 4px; color: #605e5c; font-size: 13px;">
        Date:
      </label>
      <input type="date" id="editDate" value="${startDateTime.toISOString().split('T')[0]}" 
        style="width: 100%; padding: 6px; border: 1px solid #d2d0ce; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
      <div>
        <label style="display: block; margin-bottom: 4px; color: #605e5c; font-size: 13px;">
          Start Time:
        </label>
        <input type="time" id="editStartTime" value="${startDateTime.toTimeString().slice(0, 5)}" 
          style="width: 100%; padding: 6px; border: 1px solid #d2d0ce; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; color: #605e5c; font-size: 13px;">
          End Time:
        </label>
        <input type="time" id="editEndTime" value="${endDateTime.toTimeString().slice(0, 5)}" 
          style="width: 100%; padding: 6px; border: 1px solid #d2d0ce; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
      </div>
    </div>
    
    <div style="margin-bottom: 12px;">
      <label style="display: block; margin-bottom: 4px; color: #605e5c; font-size: 13px;">
        Duration (minutes): <span id="durationDisplay" style="color: #0078d4; font-weight: 600;">${duration}</span>
      </label>
      <input type="range" id="editDuration" min="1" max="480" value="${duration}" 
        style="width: 100%;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #605e5c;">
        <span>1 min</span>
        <span>8 hours</span>
      </div>
    </div>
    
    <div style="margin-bottom: 12px; background: #fff3cd; padding: 10px; border-radius: 4px;">
      <label style="display: flex; align-items: center; font-size: 13px;">
        <input type="checkbox" id="editMultitasking" ${entry.wasMultitasking ? 'checked' : ''} 
          style="margin-right: 6px;">
        Was multi-tasking during this time
      </label>
      <div id="editMultitaskingDetails" style="display: ${entry.wasMultitasking ? 'block' : 'none'}; margin-top: 8px;">
        <label style="display: block; margin-bottom: 4px; color: #605e5c; font-size: 12px;">
          What else were you doing?
        </label>
        <select id="editMultitaskingWith" style="width: 100%; padding: 6px; border: 1px solid #d2d0ce; border-radius: 4px; font-size: 13px;">
          <option value="" disabled>Loading overlapping activities...</option>
        </select>
      </div>
    </div>
    
    <div style="display: flex; gap: 8px; margin-top: 15px;">
      <button id="saveEditBtn" style="flex: 1; padding: 8px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
        Save Changes
      </button>
      <button id="cancelEditBtn" style="flex: 1; padding: 8px; background: #605e5c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
        Cancel
      </button>
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
      { value: 'Meeting', label: '👥 In a meeting', icon: '👥' },
      { value: 'Email', label: '📧 Checking email', icon: '📧' },
      { value: 'Slack/Chat', label: '💬 On Slack/Chat', icon: '💬' },
      { value: 'Phone Call', label: '📞 On a call', icon: '📞' },
      { value: 'Admin', label: '📋 Admin work', icon: '📋' },
      { value: 'Other', label: 'Other task', icon: '📝' }
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
        document.getElementById('editMultitaskingWith').value : null
    };
    
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
          loadCategoryTotals(); // Refresh category totals
        });
      }
    }
  });
}

// Export to Excel with fixed export settings support
async function exportToExcel() {
  chrome.storage.local.get(['timeEntries', 'multitaskingSettings', 'exportSettings'], async (result) => {
    const { startDate, endDate } = getDateRange();
    const timeEntries = result.timeEntries || {};
    const settings = result.multitaskingSettings || { productivityWeight: 50 };
    const exportSettings = result.exportSettings || {
      includeMultitaskAnalysis: true,
      includeSummarySheet: true
    };
    
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
    const multiTaskingPairs = []; // New sheet for multi-tasking pairs
    
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
        
        // Add to main entries sheet with both hours and minutes
        allEntries.push({
          'Entry ID': entry.id || `${entry.type}_${new Date(entry.startTime).getTime()}`,
          Date: date,
          Type: entry.type || 'task',
          Category: entry.category || entry.subject || 'Other',
          Description: entry.description || entry.subject || '',
          'Start Time': new Date(entry.startTime).toLocaleTimeString(),
          'End Time': new Date(entry.endTime).toLocaleTimeString(),
          'Duration (hours)': hours.toFixed(2),
          'Duration (h:m)': `${displayHours}h ${displayMinutes}m`,
          'Duration (minutes)': totalMinutes,
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
    
    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Always add detailed entries sheet
    const entriesSheet = XLSX.utils.json_to_sheet(allEntries);
    XLSX.utils.book_append_sheet(wb, entriesSheet, 'Time Entries');
    
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
      const summary = calculateSummary(filteredEntries, settings.productivityWeight);
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