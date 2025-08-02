let currentTimer = null;
let startTime = null;
let currentTask = null;
let currentTaskDescription = null;
let currentDateRange = 'today'; // Track current date range
let customStartDate = null;
let customEndDate = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async function() {
  checkAuthStatus();
  setupEventListeners();
  loadCategories();
  initializeDateInputs();
  loadDataForDateRange();
  updateTimer();
});

// Load categories for manual entry dropdown
function loadCategories() {
  chrome.storage.local.get(['categories'], (result) => {
    const categories = result.categories || [
      'Email', 'Meeting', 'Project Work', 'Admin', 
      'Break', 'Training', 'Planning', 'Other'
    ];
    
    const select = document.getElementById('manualCategory');
    select.innerHTML = categories.map(cat => 
      `<option value="${cat}">${cat}</option>`
    ).join('');
  });
}

// Check authentication status
async function checkAuthStatus() {
  chrome.storage.local.get('accessToken', (result) => {
    // Always show main content - time tracking works without Outlook
    document.getElementById('mainContent').style.display = 'block';
    
    if (result.accessToken) {
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('authStatus').textContent = '✓ Connected';
      document.getElementById('syncBtn').style.display = 'inline-block';
      document.getElementById('meetingsSection').style.display = 'block';
      fetchTodayMeetings();
    } else {
      document.getElementById('loginSection').style.display = 'block';
      document.getElementById('authStatus').textContent = 'Not connected';
      document.getElementById('syncBtn').style.display = 'none';
      document.getElementById('meetingsSection').style.display = 'none';
      // Update meetings list to show connection prompt
      document.getElementById('meetingsList').innerHTML = 
        '<p style="text-align: center; color: #605e5c;">Connect to Outlook to see your meetings</p>';
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('connectBtn').addEventListener('click', authenticate);
  document.getElementById('syncBtn').addEventListener('click', fetchTodayMeetings);
  document.getElementById('exportBtn').addEventListener('click', exportToExcel);
  document.getElementById('manualEntryBtn').addEventListener('click', showManualEntry);
  document.getElementById('saveManualBtn').addEventListener('click', saveManualEntry);
  document.getElementById('cancelManualBtn').addEventListener('click', hideManualEntry);
  
  // Date range selector
  document.getElementById('dateRangeSelect').addEventListener('change', handleDateRangeChange);
  document.getElementById('applyDateRange').addEventListener('click', applyCustomDateRange);
  
  // Quick task buttons
  document.querySelectorAll('.quick-task-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskType = e.target.getAttribute('data-task');
      
      // If timer is running for this task, just stop it
      if (currentTimer && currentTask === taskType) {
        stopTimer();
        return;
      }
      
      // If starting a new timer, ask for description based on task type
      let description = null;
      
      // Always prompt for "Other"
      if (taskType === 'Other') {
        description = prompt('What type of task is this?');
        if (!description) return; // Don't start if cancelled
      } 
      // Optionally prompt for other task types
      else if (['Meeting', 'Project Work', 'Email'].includes(taskType)) {
        const promptText = {
          'Meeting': 'Meeting topic/attendees (optional):',
          'Project Work': 'What project are you working on? (optional):',
          'Email': 'Email subject/recipient (optional):'
        };
        description = prompt(promptText[taskType] || 'Details (optional):');
        // Allow empty description for non-Other tasks
      }
      
      // Stop current timer if running
      if (currentTimer) {
        stopTimer();
      }
      
      // Start new timer
      startTimer(taskType, description);
    });
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
  
  // Manual entry time selection
  document.getElementById('manualWhen').addEventListener('change', function() {
    if (this.value === 'custom') {
      document.getElementById('customTimeGroup').style.display = 'block';
      // Set default to current time
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      document.getElementById('customDateTime').value = now.toISOString().slice(0, 16);
    } else {
      document.getElementById('customTimeGroup').style.display = 'none';
    }
  });
  
  // Event delegation for edit/delete buttons (to avoid inline handlers)
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

// Authenticate with Outlook
async function authenticate() {
  document.getElementById('connectBtn').disabled = true;
  document.getElementById('connectBtn').textContent = 'Connecting...';
  
  chrome.runtime.sendMessage({ action: 'authenticate' }, (response) => {
    if (response.success) {
      checkAuthStatus();
    } else {
      alert('Authentication failed: ' + response.error);
      document.getElementById('connectBtn').disabled = false;
      document.getElementById('connectBtn').textContent = 'Connect to Outlook';
    }
  });
}

// Start timer
function startTimer(taskType, description = null) {
  currentTask = taskType;
  currentTaskDescription = description;
  startTime = Date.now();
  currentTimer = setInterval(updateTimer, 1000);
  
  // Update UI
  document.querySelectorAll('.quick-task-btn').forEach(btn => {
    if (btn.getAttribute('data-task') === taskType) {
      btn.style.background = '#0078d4';
      btn.style.color = 'white';
    } else {
      btn.style.background = '#e1dfdd';
      btn.style.color = 'inherit';
    }
  });
}

// Stop timer
function stopTimer() {
  if (!currentTimer) return;
  
  clearInterval(currentTimer);
  const duration = Date.now() - startTime;
  
  // Save time entry
  saveTimeEntry({
    type: 'task',
    category: currentTask,
    description: currentTaskDescription || '',
    startTime: new Date(startTime).toISOString(),
    endTime: new Date().toISOString(),
    duration: duration,
    date: new Date().toDateString()
  });
  
  // Reset
  currentTimer = null;
  startTime = null;
  currentTask = null;
  currentTaskDescription = null;
  
  // Reset UI
  document.querySelectorAll('.quick-task-btn').forEach(btn => {
    btn.style.background = '#e1dfdd';
    btn.style.color = 'inherit';
  });
  
  document.getElementById('timerDisplay').textContent = '00:00:00';
  loadDataForDateRange(); // Use current date range instead of just today
}

// Update timer display
function updateTimer() {
  if (!currentTimer || !startTime) return;
  
  const elapsed = Date.now() - startTime;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  
  document.getElementById('timerDisplay').textContent = 
    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Fetch today's meetings
async function fetchTodayMeetings() {
  const meetingsList = document.getElementById('meetingsList');
  meetingsList.innerHTML = '<div class="loading">Loading meetings...</div>';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  chrome.runtime.sendMessage({
    action: 'fetchEvents',
    startDate: today.toISOString(),
    endDate: tomorrow.toISOString()
  }, (response) => {
    if (response.success) {
      displayMeetings(response.events);
      saveMeetings(response.events);
    } else {
      meetingsList.innerHTML = `<div class="error">Failed to load meetings: ${response.error}</div>`;
    }
  });
}

// Display meetings
function displayMeetings(meetings) {
  const meetingsList = document.getElementById('meetingsList');
  
  if (meetings.length === 0) {
    meetingsList.innerHTML = '<p>No meetings scheduled for today</p>';
    return;
  }
  
  meetingsList.innerHTML = meetings.map(meeting => {
    const start = new Date(meeting.start.dateTime);
    const end = new Date(meeting.end.dateTime);
    const duration = (end - start) / 60000; // minutes
    
    return `
      <div class="meeting-item">
        <div class="meeting-title">${meeting.subject}</div>
        <div class="meeting-time">
          ${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
          ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
          (${duration} min)
        </div>
      </div>
    `;
  }).join('');
}

// Save meetings to storage
function saveMeetings(meetings) {
  const today = new Date().toDateString();
  const meetingEntries = meetings.map(meeting => ({
    type: 'meeting',
    subject: meeting.subject,
    startTime: meeting.start.dateTime,
    endTime: meeting.end.dateTime,
    duration: new Date(meeting.end.dateTime) - new Date(meeting.start.dateTime),
    organizer: meeting.organizer?.emailAddress?.name || 'Unknown',
    date: today
  }));
  
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    if (!timeEntries[today]) {
      timeEntries[today] = [];
    }
    
    // Remove existing meetings for today and add new ones
    timeEntries[today] = timeEntries[today].filter(entry => entry.type !== 'meeting');
    timeEntries[today].push(...meetingEntries);
    
    chrome.storage.local.set({ timeEntries }, () => {
      loadDataForDateRange(); // Use current date range instead of just today
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
    chrome.storage.local.set({ timeEntries });
  });
}

// Initialize date inputs with today's date
function initializeDateInputs() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('startDate').value = today;
  document.getElementById('endDate').value = today;
}

// Handle date range selection change
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

// Get date range based on selection
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
      startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      endDate = new Date(today);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case 'lastweek':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay() - 7); // Start of last week
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
      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
      
    default:
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
  }
  
  return { startDate, endDate };
}

// Load data for selected date range
function loadDataForDateRange() {
  const { startDate, endDate } = getDateRange();
  
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    const rangeEntries = [];
    
    // Collect entries within date range
    Object.keys(timeEntries).forEach(dateStr => {
      const entryDate = new Date(dateStr);
      entryDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
      if (entryDate >= startDate && entryDate <= endDate) {
        timeEntries[dateStr].forEach(entry => {
          rangeEntries.push({...entry, date: dateStr});
        });
      }
    });
    
    // Calculate stats
    let totalTime = 0;
    let meetingTime = 0;
    let taskTime = 0;
    const tasks = [];
    const meetings = [];
    
    rangeEntries.forEach(entry => {
      if (entry.type === 'meeting') {
        meetingTime += entry.duration;
        meetings.push(entry);
      } else {
        taskTime += entry.duration;
        tasks.push(entry);
      }
      totalTime += entry.duration;
    });
    
    // Update stats
    document.getElementById('totalTime').textContent = formatDuration(totalTime);
    document.getElementById('meetingTime').textContent = formatDuration(meetingTime);
    document.getElementById('taskTime').textContent = formatDuration(taskTime);
    
    // Update section titles with date range
    updateSectionTitles(startDate, endDate);
    
    // Display tasks and meetings
    displayTasks(tasks);
    displayRangeMeetings(meetings);
  });
}

// Update section titles to show current date range
function updateSectionTitles(startDate, endDate) {
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  let dateRangeText = '';
  let summaryText = '';
  
  if (currentDateRange === 'today') {
    dateRangeText = "Today's";
    summaryText = "Showing: Today";
  } else if (currentDateRange === 'yesterday') {
    dateRangeText = "Yesterday's";
    summaryText = "Showing: Yesterday";
  } else if (currentDateRange === 'week') {
    dateRangeText = "This Week's";
    summaryText = `Showing: This Week (${formatDate(startDate)} - ${formatDate(endDate)})`;
  } else if (currentDateRange === 'lastweek') {
    dateRangeText = "Last Week's";
    summaryText = `Showing: Last Week (${formatDate(startDate)} - ${formatDate(endDate)})`;
  } else if (currentDateRange === 'month') {
    dateRangeText = "This Month's";
    summaryText = `Showing: ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  } else if (startDate.toDateString() === endDate.toDateString()) {
    const shortDate = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dateRangeText = shortDate;
    summaryText = `Showing: ${formatDate(startDate)}`;
  } else {
    const shortStart = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const shortEnd = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dateRangeText = `${shortStart} - ${shortEnd}`;
    summaryText = `Showing: ${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  
  // Update date summary
  const dateSummary = document.getElementById('dateSummary');
  if (dateSummary) {
    dateSummary.textContent = summaryText;
  }
  
  // Update section titles
  const taskSection = document.querySelector('#tasksList').parentElement.querySelector('.section-title');
  if (taskSection) {
    taskSection.textContent = `${dateRangeText} Logged Tasks`;
  }
  
  const meetingsSection = document.querySelector('#meetingsList').parentElement.querySelector('.section-title');
  if (meetingsSection) {
    meetingsSection.textContent = `${dateRangeText} Meetings`;
  }
}

// Display meetings for date range
function displayRangeMeetings(meetings) {
  const meetingsList = document.getElementById('meetingsList');
  
  if (!document.getElementById('meetingsSection').style.display || 
      document.getElementById('meetingsSection').style.display === 'none') {
    return; // Don't display if not connected to Outlook
  }
  
  if (meetings.length === 0) {
    meetingsList.innerHTML = '<p style="text-align: center; color: #605e5c;">No meetings in this period</p>';
    return;
  }
  
  // Sort meetings by date and time
  meetings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
  meetingsList.innerHTML = meetings.map(meeting => {
    const start = new Date(meeting.startTime);
    const end = new Date(meeting.endTime);
    const duration = meeting.duration / 60000; // minutes
    
    return `
      <div class="meeting-item">
        <div class="meeting-title">${meeting.subject || meeting.description || 'Meeting'}</div>
        <div class="meeting-time">
          ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
          ${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
          ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
          (${Math.round(duration)} min)
        </div>
      </div>
    `;
  }).join('');
}

// Load today's data (keeping for backward compatibility)
function loadTodayData() {
  currentDateRange = 'today';
  document.getElementById('dateRangeSelect').value = 'today';
  loadDataForDateRange();
}

// Display tasks - NO inline onclick handlers
function displayTasks(tasks) {
  const tasksList = document.getElementById('tasksList');
  
  if (tasks.length === 0) {
    tasksList.innerHTML = '<p style="text-align: center; color: #605e5c;">No tasks logged in this period</p>';
    return;
  }
  
  // Sort tasks by start time (most recent first)
  tasks.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  
  // Check if we're showing multiple days
  const showDate = currentDateRange !== 'today' && currentDateRange !== 'yesterday';
  
  tasksList.innerHTML = tasks.map((task, index) => {
    const start = new Date(task.startTime);
    const duration = task.duration / 60000; // minutes
    
    // Format display based on category and description
    let displayTitle = task.category;
    if (task.category === 'Other' && task.description) {
      displayTitle = task.description;
    } else if (task.description) {
      displayTitle = `${task.category}: ${task.description}`;
    }
    
    // Add date if showing multiple days
    const dateDisplay = showDate ? 
      `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ` : '';
    
    return `
      <div class="task-item" data-index="${index}">
        <div class="task-actions">
          <button class="task-action-btn edit-btn" data-index="${index}">Edit</button>
          <button class="task-action-btn delete delete-btn" data-index="${index}">Delete</button>
        </div>
        <div class="task-title">${displayTitle}</div>
        <div class="task-time">
          ${dateDisplay}${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
          (${Math.round(duration)} min)
        </div>
      </div>
    `;
  }).join('');
}

// Edit task - now works with date ranges
function editTask(index) {
  const { startDate, endDate } = getDateRange();
  
  chrome.storage.local.get(['timeEntries', 'categories'], (result) => {
    const timeEntries = result.timeEntries || {};
    const categories = result.categories || [
      'Email', 'Meeting', 'Project Work', 'Admin', 
      'Break', 'Training', 'Planning', 'Other'
    ];
    
    // Collect tasks from date range
    const allTasks = [];
    Object.keys(timeEntries).forEach(dateStr => {
      const entryDate = new Date(dateStr);
      entryDate.setHours(12, 0, 0, 0);
      
      if (entryDate >= startDate && entryDate <= endDate) {
        timeEntries[dateStr].forEach(entry => {
          if (entry.type === 'task') {
            allTasks.push({ ...entry, date: dateStr });
          }
        });
      }
    });
    
    // Sort tasks by start time (most recent first) to match display order
    allTasks.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    if (allTasks[index]) {
      const task = allTasks[index];
      
      // Create a simple dialog for editing
      const categoryList = categories.join('\n');
      const newCategory = prompt(
        `Select category (enter one of these):\n${categoryList}\n\nCurrent: ${task.category}`,
        task.category
      );
      
      if (newCategory === null) return; // Cancelled
      
      const newDuration = prompt('Enter duration in minutes:', Math.round(task.duration / 60000));
      
      if (newDuration && !isNaN(newDuration)) {
        const newDescription = prompt('Description:', task.description || '');
        
        // Find and update the original entry
        const dateEntries = timeEntries[task.date];
        const originalIndex = dateEntries.findIndex(e => 
          e.startTime === task.startTime && e.category === task.category
        );
        
        if (originalIndex !== -1) {
          dateEntries[originalIndex].category = newCategory || task.category;
          dateEntries[originalIndex].duration = parseInt(newDuration) * 60000;
          dateEntries[originalIndex].description = newDescription;
          
          // Recalculate end time based on new duration
          const startTime = new Date(dateEntries[originalIndex].startTime);
          dateEntries[originalIndex].endTime = new Date(startTime.getTime() + dateEntries[originalIndex].duration).toISOString();
          
          chrome.storage.local.set({ timeEntries }, () => {
            loadDataForDateRange();
          });
        }
      }
    }
  });
}

// Delete task - now works with date ranges
function deleteTask(index) {
  if (!confirm('Are you sure you want to delete this entry?')) return;
  
  const { startDate, endDate } = getDateRange();
  
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    
    // Collect tasks from date range
    const allTasks = [];
    Object.keys(timeEntries).forEach(dateStr => {
      const entryDate = new Date(dateStr);
      entryDate.setHours(12, 0, 0, 0);
      
      if (entryDate >= startDate && entryDate <= endDate) {
        timeEntries[dateStr].forEach(entry => {
          if (entry.type === 'task') {
            allTasks.push({ ...entry, date: dateStr });
          }
        });
      }
    });
    
    // Sort tasks by start time (most recent first) to match display order
    allTasks.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    if (allTasks[index]) {
      const taskToDelete = allTasks[index];
      
      // Find and remove the entry
      const dateEntries = timeEntries[taskToDelete.date];
      const originalIndex = dateEntries.findIndex(e => 
        e.startTime === taskToDelete.startTime && e.category === taskToDelete.category
      );
      
      if (originalIndex !== -1) {
        dateEntries.splice(originalIndex, 1);
        chrome.storage.local.set({ timeEntries }, () => {
          loadDataForDateRange();
        });
      }
    }
  });
}

// Format duration
function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Export to Excel
function exportToExcel() {
  // Check if XLSX library is loaded
  if (typeof XLSX === 'undefined') {
    // Fallback to CSV export if XLSX is not available
    const useCSV = confirm('Excel library not loaded. Would you like to export as CSV instead?\n\nCSV files can be opened in Excel.');
    if (useCSV) {
      exportToCSV();
    } else {
      alert('To export as Excel:\n1. Download: https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js\n2. Save as: xlsx.min.js in your extension folder\n3. Reload the extension');
    }
    return;
  }
  
  const { startDate, endDate } = getDateRange();
  
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    
    // Prepare data for Excel - filtered by date range
    const data = [];
    const filteredEntries = {};
    
    Object.keys(timeEntries).forEach(dateStr => {
      const entryDate = new Date(dateStr);
      entryDate.setHours(12, 0, 0, 0);
      
      if (entryDate >= startDate && entryDate <= endDate) {
        filteredEntries[dateStr] = timeEntries[dateStr];
        
        timeEntries[dateStr].forEach(entry => {
          data.push({
            Date: dateStr,
            Type: entry.type,
            Category: entry.category || entry.subject || 'N/A',
            Description: entry.description || entry.subject || '',
            'Start Time': new Date(entry.startTime).toLocaleTimeString(),
            'End Time': new Date(entry.endTime).toLocaleTimeString(),
            'Duration (min)': Math.round(entry.duration / 60000),
            'Duration (hours)': (entry.duration / 3600000).toFixed(2),
            Notes: entry.notes || ''
          });
        });
      }
    });
    
    if (data.length === 0) {
      alert('No time entries found for the selected date range.');
      return;
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add summary sheet
    const summary = calculateSummary(filteredEntries);
    const ws2 = XLSX.utils.json_to_sheet(summary);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Time Log');
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
    
    // Generate filename with date range
    const dateRangeStr = currentDateRange === 'custom' ? 
      `${customStartDate}_to_${customEndDate}` : currentDateRange;
    const filename = `TimeTracker_${dateRangeStr}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  });
}

// Export to CSV (fallback when XLSX is not available)
function exportToCSV() {
  const { startDate, endDate } = getDateRange();
  
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    
    // Prepare CSV data - filtered by date range
    const csvRows = [];
    csvRows.push(['Date', 'Type', 'Category', 'Description', 'Start Time', 'End Time', 'Duration (min)', 'Duration (hours)']);
    
    let hasData = false;
    
    Object.keys(timeEntries).sort().forEach(dateStr => {
      const entryDate = new Date(dateStr);
      entryDate.setHours(12, 0, 0, 0);
      
      if (entryDate >= startDate && entryDate <= endDate) {
        hasData = true;
        const entries = timeEntries[dateStr];
        entries.forEach(entry => {
          csvRows.push([
            dateStr,
            entry.type,
            entry.category || entry.subject || 'N/A',
            entry.description || entry.subject || '',
            new Date(entry.startTime).toLocaleTimeString(),
            new Date(entry.endTime).toLocaleTimeString(),
            Math.round(entry.duration / 60000),
            (entry.duration / 3600000).toFixed(2)
          ]);
        });
      }
    });
    
    if (!hasData) {
      alert('No time entries found for the selected date range.');
      return;
    }
    
    // Convert to CSV string
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(cell).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(',')
    ).join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Generate filename with date range
    const dateRangeStr = currentDateRange === 'custom' ? 
      `${customStartDate}_to_${customEndDate}` : currentDateRange;
    a.download = `TimeTracker_${dateRangeStr}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  });
}

// Show manual entry form
function showManualEntry() {
  document.getElementById('manualEntryForm').style.display = 'block';
  document.getElementById('manualDescription').value = '';
  document.getElementById('manualDuration').value = '30';
  document.getElementById('manualWhen').value = 'now';
  document.getElementById('customTimeGroup').style.display = 'none';
  
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
    // Set to a few hours ago as default for "earlier today"
    endTime = new Date();
    endTime.setHours(endTime.getHours() - 2);
  } else {
    endTime = new Date();
  }
  
  const startTime = new Date(endTime.getTime() - duration);
  
  const entry = {
    type: 'task',
    category: category,
    description: description,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: duration,
    date: startTime.toDateString() // Use start time's date in case it spans midnight
  };
  
  saveTimeEntry(entry);
  hideManualEntry();
  loadDataForDateRange(); // Use current date range instead of just today
  
  // Show success feedback
  const btn = document.getElementById('manualEntryBtn');
  const originalText = btn.textContent;
  btn.textContent = '✓ Saved!';
  btn.style.background = '#107c10';
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
  }, 2000);
}

// Calculate summary for Excel
function calculateSummary(timeEntries) {
  const summary = [];
  const categoryTotals = {};
  
  Object.keys(timeEntries).forEach(date => {
    const entries = timeEntries[date];
    let dayTotal = 0;
    const dayCategoryTotals = {};
    
    entries.forEach(entry => {
      const category = entry.category || entry.subject || 'Other';
      const duration = entry.duration / 3600000; // hours
      
      dayTotal += duration;
      dayCategoryTotals[category] = (dayCategoryTotals[category] || 0) + duration;
      categoryTotals[category] = (categoryTotals[category] || 0) + duration;
    });
    
    // Get all task entries (non-meetings)
    const taskEntries = entries.filter(e => e.type === 'task');
    const meetingEntries = entries.filter(e => e.type === 'meeting');
    
    summary.push({
      Date: date,
      'Total Hours': dayTotal.toFixed(2),
      'Meeting Hours': meetingEntries.reduce((sum, e) => sum + e.duration / 3600000, 0).toFixed(2),
      'Task Hours': taskEntries.reduce((sum, e) => sum + e.duration / 3600000, 0).toFixed(2),
      'Email Hours': (dayCategoryTotals['Email'] || 0).toFixed(2),
      'Project Work Hours': (dayCategoryTotals['Project Work'] || 0).toFixed(2),
      'Break Hours': (dayCategoryTotals['Break'] || 0).toFixed(2),
      'Admin Hours': (dayCategoryTotals['Admin'] || 0).toFixed(2),
      'Other Hours': Object.keys(dayCategoryTotals)
        .filter(k => !['Meeting', 'Email', 'Project Work', 'Break', 'Admin'].includes(k))
        .reduce((sum, k) => sum + dayCategoryTotals[k], 0)
        .toFixed(2)
    });
  });
  
  return summary;
}