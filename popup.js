let currentTimer = null;
let startTime = null;
let currentTask = null;
let currentTaskDescription = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async function() {
  checkAuthStatus();
  setupEventListeners();
  loadCategories();
  loadTodayData();
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
  loadTodayData();
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
      loadTodayData();
    });
  });
}

// Save time entry
function saveTimeEntry(entry) {
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    const today = new Date().toDateString();
    
    if (!timeEntries[today]) {
      timeEntries[today] = [];
    }
    
    timeEntries[today].push(entry);
    chrome.storage.local.set({ timeEntries });
  });
}

// Load today's data
function loadTodayData() {
  const today = new Date().toDateString();
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    const todayEntries = timeEntries[today] || [];
    
    let totalTime = 0;
    let meetingTime = 0;
    let taskTime = 0;
    
    // Separate tasks from meetings
    const tasks = [];
    
    todayEntries.forEach(entry => {
      if (entry.type === 'meeting') {
        meetingTime += entry.duration;
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
    
    // Display tasks
    displayTasks(tasks);
  });
}

// Display tasks - NO inline onclick handlers
function displayTasks(tasks) {
  const tasksList = document.getElementById('tasksList');
  
  if (tasks.length === 0) {
    tasksList.innerHTML = '<p style="text-align: center; color: #605e5c;">No tasks logged yet</p>';
    return;
  }
  
  // Sort tasks by start time (most recent first)
  tasks.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  
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
    
    return `
      <div class="task-item" data-index="${index}">
        <div class="task-actions">
          <button class="task-action-btn edit-btn" data-index="${index}">Edit</button>
          <button class="task-action-btn delete delete-btn" data-index="${index}">Delete</button>
        </div>
        <div class="task-title">${displayTitle}</div>
        <div class="task-time">
          ${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
          (${Math.round(duration)} min)
        </div>
      </div>
    `;
  }).join('');
}

// Edit task - now a regular function, not window.editTask
function editTask(index) {
  const today = new Date().toDateString();
  chrome.storage.local.get(['timeEntries', 'categories'], (result) => {
    const timeEntries = result.timeEntries || {};
    const todayEntries = timeEntries[today] || [];
    const tasks = todayEntries.filter(e => e.type === 'task');
    const categories = result.categories || [
      'Email', 'Meeting', 'Project Work', 'Admin', 
      'Break', 'Training', 'Planning', 'Other'
    ];
    
    if (tasks[index]) {
      const task = tasks[index];
      
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
        
        // Find the original entry in todayEntries
        const originalIndex = todayEntries.findIndex(e => 
          e === task || (e.startTime === task.startTime && e.category === task.category)
        );
        
        if (originalIndex !== -1) {
          todayEntries[originalIndex].category = newCategory || task.category;
          todayEntries[originalIndex].duration = parseInt(newDuration) * 60000;
          todayEntries[originalIndex].description = newDescription;
          
          // Recalculate end time based on new duration
          const startTime = new Date(todayEntries[originalIndex].startTime);
          todayEntries[originalIndex].endTime = new Date(startTime.getTime() + todayEntries[originalIndex].duration).toISOString();
          
          chrome.storage.local.set({ timeEntries }, () => {
            loadTodayData();
          });
        }
      }
    }
  });
}

// Delete task - now a regular function, not window.deleteTask
function deleteTask(index) {
  if (!confirm('Are you sure you want to delete this entry?')) return;
  
  const today = new Date().toDateString();
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    const todayEntries = timeEntries[today] || [];
    const tasks = todayEntries.filter(e => e.type === 'task');
    
    if (tasks[index]) {
      const taskToDelete = tasks[index];
      
      // Find and remove the entry
      const originalIndex = todayEntries.findIndex(e => 
        e === taskToDelete || (e.startTime === taskToDelete.startTime && e.category === taskToDelete.category)
      );
      
      if (originalIndex !== -1) {
        todayEntries.splice(originalIndex, 1);
        chrome.storage.local.set({ timeEntries }, () => {
          loadTodayData();
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
  
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    
    // Check if there's any data to export
    if (Object.keys(timeEntries).length === 0) {
      alert('No time entries to export. Start tracking your time first!');
      return;
    }
    
    // Prepare data for Excel
    const data = [];
    
    Object.keys(timeEntries).sort().forEach(date => {
      const entries = timeEntries[date];
      entries.forEach(entry => {
        data.push({
          Date: date,
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
    });
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add summary sheet
    const summary = calculateSummary(timeEntries);
    const ws2 = XLSX.utils.json_to_sheet(summary);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Time Log');
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
    
    // Generate file
    const filename = `TimeTracker_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  });
}

// Export to CSV (fallback when XLSX is not available)
function exportToCSV() {
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    
    if (Object.keys(timeEntries).length === 0) {
      alert('No time entries to export. Start tracking your time first!');
      return;
    }
    
    // Prepare CSV data
    const csvRows = [];
    csvRows.push(['Date', 'Type', 'Category', 'Description', 'Start Time', 'End Time', 'Duration (min)', 'Duration (hours)']);
    
    Object.keys(timeEntries).sort().forEach(date => {
      const entries = timeEntries[date];
      entries.forEach(entry => {
        csvRows.push([
          date,
          entry.type,
          entry.category || entry.subject || 'N/A',
          entry.description || entry.subject || '',
          new Date(entry.startTime).toLocaleTimeString(),
          new Date(entry.endTime).toLocaleTimeString(),
          Math.round(entry.duration / 60000),
          (entry.duration / 3600000).toFixed(2)
        ]);
      });
    });
    
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
    a.download = `TimeTracker_${new Date().toISOString().split('T')[0]}.csv`;
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
  
  const endTime = when === 'now' ? new Date() : new Date();
  const startTime = new Date(endTime.getTime() - duration);
  
  const entry = {
    type: 'task',
    category: category,
    description: description,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: duration,
    date: new Date().toDateString()
  };
  
  saveTimeEntry(entry);
  hideManualEntry();
  loadTodayData();
  
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