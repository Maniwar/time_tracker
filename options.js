// Complete options.js - Settings Page Logic with Multi-tasking and Google Calendar Support

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  loadStatistics();
  loadAccountStatus();
  loadCategories();
  loadQuickActions();
  loadExportSettings();
  loadMultitaskingSettings();
  loadAutoTrackingSettings();
  setupEventListeners();
  
  // Show redirect URI for Azure setup
  const redirectUri = chrome.identity.getRedirectURL();
  document.getElementById('redirectUri').textContent = redirectUri;
});

// Load and display statistics
function loadStatistics() {
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    
    let totalHours = 0;
    let totalEntries = 0;
    let multitaskingHours = 0;
    let daysTracked = Object.keys(timeEntries).length;
    
    Object.values(timeEntries).forEach(dayEntries => {
      dayEntries.forEach(entry => {
        totalHours += entry.duration / 3600000;
        totalEntries++;
        if (entry.wasMultitasking) {
          multitaskingHours += entry.duration / 3600000;
        }
      });
    });
    
    document.getElementById('totalTrackedHours').textContent = totalHours.toFixed(0);
    document.getElementById('totalEntries').textContent = totalEntries;
    document.getElementById('multitaskPercent').textContent = 
      totalHours > 0 ? Math.round((multitaskingHours / totalHours) * 100) + '%' : '0%';
    document.getElementById('avgDailyHours').textContent = 
      daysTracked > 0 ? (totalHours / daysTracked).toFixed(1) : '0';
  });
}

// Load account status for both Google and Outlook
function loadAccountStatus() {
  // Check Google Calendar status
  chrome.storage.local.get(['googleConnected', 'googleEmail'], (result) => {
    const googleCard = document.getElementById('googleAccountCard');
    const googleEmail = document.getElementById('googleAccountEmail');
    
    if (result.googleConnected && result.googleEmail) {
      googleCard.classList.add('connected');
      googleEmail.textContent = result.googleEmail;
      googleEmail.style.color = '#107c10';
    } else {
      googleCard.classList.remove('connected');
      googleEmail.textContent = 'Not connected';
      googleEmail.style.color = '#605e5c';
    }
  });
  
  // Check Outlook status
  chrome.storage.local.get(['accessToken', 'userEmail', 'tokenExpiry', 'clientId'], (result) => {
    const outlookCard = document.getElementById('outlookAccountCard');
    const outlookEmail = document.getElementById('outlookAccountEmail');
    
    if (result.clientId) {
      document.getElementById('clientIdInput').value = result.clientId;
    }
    
    if (result.accessToken && result.tokenExpiry) {
      const expiry = new Date(result.tokenExpiry);
      if (new Date() < expiry) {
        outlookCard.classList.add('connected');
        outlookEmail.textContent = result.userEmail || 'Connected';
        outlookEmail.style.color = '#107c10';
      } else {
        outlookCard.classList.remove('connected');
        outlookEmail.textContent = 'Token expired - Reconnect required';
        outlookEmail.style.color = '#d83b01';
      }
    } else {
      outlookCard.classList.remove('connected');
      outlookEmail.textContent = 'Not connected';
      outlookEmail.style.color = '#605e5c';
    }
  });
}

// Load categories
function loadCategories() {
  chrome.storage.local.get(['categories'], (result) => {
    const categories = result.categories || [
      'Email', 'Meeting', 'Project Work', 'Admin', 
      'Break', 'Training', 'Planning', 'Other'
    ];
    
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';
    
    categories.forEach((category, index) => {
      const li = document.createElement('li');
      li.className = 'category-item';
      li.draggable = true;
      li.dataset.index = index;
      
      li.innerHTML = `
        <span class="category-name">${category}</span>
        ${category !== 'Meeting' ? `<button class="delete-category" data-category="${category}">Delete</button>` : ''}
      `;
      
      categoryList.appendChild(li);
    });
    
    setupDragAndDrop();
  });
}

// Setup drag and drop for categories
function setupDragAndDrop() {
  const categoryItems = document.querySelectorAll('.category-item');
  let draggedItem = null;
  
  categoryItems.forEach(item => {
    item.addEventListener('dragstart', function(e) {
      draggedItem = this;
      this.classList.add('dragging');
    });
    
    item.addEventListener('dragend', function(e) {
      this.classList.remove('dragging');
    });
    
    item.addEventListener('dragover', function(e) {
      e.preventDefault();
      const afterElement = getDragAfterElement(document.getElementById('categoryList'), e.clientY);
      const categoryList = document.getElementById('categoryList');
      
      if (afterElement == null) {
        categoryList.appendChild(draggedItem);
      } else {
        categoryList.insertBefore(draggedItem, afterElement);
      }
    });
  });
  
  // Delete category buttons
  document.querySelectorAll('.delete-category').forEach(btn => {
    btn.addEventListener('click', function() {
      const category = this.dataset.category;
      if (confirm(`Delete category "${category}"?`)) {
        deleteCategory(category);
      }
    });
  });
}

// Get element after drag position
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.category-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Delete category
function deleteCategory(categoryToDelete) {
  chrome.storage.local.get(['categories', 'quickActions'], (result) => {
    let categories = result.categories || [];
    let quickActions = result.quickActions || [];
    
    categories = categories.filter(cat => cat !== categoryToDelete);
    quickActions = quickActions.filter(cat => cat !== categoryToDelete);
    
    chrome.storage.local.set({ categories, quickActions }, () => {
      loadCategories();
      loadQuickActions();
      showSuccess('categorySuccess');
    });
  });
}

// Load quick actions
function loadQuickActions() {
  chrome.storage.local.get(['categories', 'quickActions'], (result) => {
    const categories = result.categories || [
      'Email', 'Meeting', 'Project Work', 'Admin', 
      'Break', 'Training', 'Planning', 'Other'
    ];
    const quickActions = result.quickActions || categories.slice(0, 6);
    
    const quickActionsList = document.getElementById('quickActionsList');
    quickActionsList.innerHTML = '';
    
    categories.forEach(category => {
      const div = document.createElement('div');
      div.className = 'checkbox-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `quick-${category}`;
      checkbox.value = category;
      checkbox.checked = quickActions.includes(category);
      
      const label = document.createElement('label');
      label.htmlFor = `quick-${category}`;
      label.textContent = category;
      
      div.appendChild(checkbox);
      div.appendChild(label);
      quickActionsList.appendChild(div);
    });
  });
}

// Load export settings
function loadExportSettings() {
  chrome.storage.local.get(['exportSettings'], (result) => {
    const settings = result.exportSettings || {
      defaultDateRange: 'week',
      includeMultitaskAnalysis: true,
      includeSummarySheet: true
    };
    
    document.getElementById('dateRangeSelect').value = settings.defaultDateRange;
    document.getElementById('includeMultitaskAnalysis').checked = settings.includeMultitaskAnalysis;
    document.getElementById('includeSummarySheet').checked = settings.includeSummarySheet;
  });
}

// Load multi-tasking settings
function loadMultitaskingSettings() {
  chrome.storage.local.get(['multitaskingSettings'], (result) => {
    const settings = result.multitaskingSettings || {
      productivityWeight: 50,
      autoEndMeeting: true,
      showMultitaskWarning: false
    };
    
    document.getElementById('productivityWeight').value = settings.productivityWeight;
    document.getElementById('autoEndMeeting').checked = settings.autoEndMeeting;
    document.getElementById('showMultitaskWarning').checked = settings.showMultitaskWarning;
  });
}

// Load auto-tracking settings
function loadAutoTrackingSettings() {
  chrome.storage.local.get(['autoTrackMeetings', 'autoTrackSettings'], (result) => {
    document.getElementById('autoTrackMeetings').checked = result.autoTrackMeetings || false;
    
    const settings = result.autoTrackSettings || {
      gracePeriod: 2,
      notifications: true,
      autoEnd: true
    };
    
    document.getElementById('autoTrackGracePeriod').value = settings.gracePeriod;
    document.getElementById('autoTrackNotifications').checked = settings.notifications;
    document.getElementById('autoEndMeetings').checked = settings.autoEnd;
  });
}

// Setup event listeners
function setupEventListeners() {
  // Client ID
  document.getElementById('saveClientIdBtn').addEventListener('click', saveClientId);
  
  // Categories
  document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
  document.getElementById('newCategoryInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addCategory();
  });
  
  // Quick actions
  document.getElementById('saveQuickActionsBtn').addEventListener('click', saveQuickActions);
  
  // Export settings
  document.getElementById('saveExportSettingsBtn').addEventListener('click', saveExportSettings);
  
  // Multi-tasking settings
  document.getElementById('saveMultitaskingBtn').addEventListener('click', saveMultitaskingSettings);
  
  // Auto-tracking settings
  document.getElementById('saveAutoTrackingBtn').addEventListener('click', saveAutoTrackingSettings);
  
  // Data management
  document.getElementById('exportAllBtn').addEventListener('click', exportAllData);
  document.getElementById('backupBtn').addEventListener('click', createBackup);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importData);
  document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
}

// Save client ID
function saveClientId() {
  const clientId = document.getElementById('clientIdInput').value.trim();
  
  if (!clientId) {
    alert('Please enter a valid Client ID');
    return;
  }
  
  chrome.storage.local.set({ clientId }, () => {
    showSuccess('accountSuccess');
    alert('Client ID saved! You can now connect to Outlook via the extension popup.');
  });
}

// Add category
function addCategory() {
  const input = document.getElementById('newCategoryInput');
  const newCategory = input.value.trim();
  
  if (!newCategory) return;
  
  chrome.storage.local.get(['categories'], (result) => {
    const categories = result.categories || [];
    
    if (categories.includes(newCategory)) {
      alert('Category already exists');
      return;
    }
    
    categories.push(newCategory);
    chrome.storage.local.set({ categories }, () => {
      input.value = '';
      loadCategories();
      loadQuickActions();
      showSuccess('categorySuccess');
    });
  });
}

// Save quick actions
function saveQuickActions() {
  const checkboxes = document.querySelectorAll('#quickActionsList input[type="checkbox"]:checked');
  
  if (checkboxes.length > 6) {
    alert('Please select maximum 6 quick actions');
    return;
  }
  
  const quickActions = Array.from(checkboxes).map(cb => cb.value);
  
  chrome.storage.local.set({ quickActions }, () => {
    showSuccess('quickActionSuccess');
  });
}

// Save export settings
function saveExportSettings() {
  const exportSettings = {
    defaultDateRange: document.getElementById('dateRangeSelect').value,
    includeMultitaskAnalysis: document.getElementById('includeMultitaskAnalysis').checked,
    includeSummarySheet: document.getElementById('includeSummarySheet').checked
  };
  
  chrome.storage.local.set({ exportSettings }, () => {
    showSuccess('exportSuccess');
  });
}

// Save multi-tasking settings
function saveMultitaskingSettings() {
  const multitaskingSettings = {
    productivityWeight: parseInt(document.getElementById('productivityWeight').value),
    autoEndMeeting: document.getElementById('autoEndMeeting').checked,
    showMultitaskWarning: document.getElementById('showMultitaskWarning').checked
  };
  
  chrome.storage.local.set({ multitaskingSettings }, () => {
    showSuccess('multitaskingSuccess');
  });
}

// Save auto-tracking settings
function saveAutoTrackingSettings() {
  const autoTrackMeetings = document.getElementById('autoTrackMeetings').checked;
  const autoTrackSettings = {
    gracePeriod: parseInt(document.getElementById('autoTrackGracePeriod').value),
    notifications: document.getElementById('autoTrackNotifications').checked,
    autoEnd: document.getElementById('autoEndMeetings').checked
  };
  
  chrome.storage.local.set({ autoTrackMeetings, autoTrackSettings }, () => {
    showSuccess('autoTrackingSuccess');
    
    // Notify popup to restart auto-tracking check if enabled
    if (autoTrackMeetings) {
      chrome.runtime.sendMessage({ action: 'restartAutoTracking' });
    }
  });
}

// Export all data to Excel
function exportAllData() {
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    
    if (Object.keys(timeEntries).length === 0) {
      alert('No data to export');
      return;
    }
    
    // Prepare all entries
    const allEntries = [];
    const multiTaskingAnalysis = [];
    
    Object.keys(timeEntries).forEach(date => {
      const entries = timeEntries[date];
      
      let totalMultitaskingTime = 0;
      let meetingMultitaskingTime = 0;
      
      entries.forEach(entry => {
        const hours = entry.duration / 3600000;
        
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
          'Provider': entry.provider || 'Manual'
        });
        
        if (entry.wasMultitasking) {
          totalMultitaskingTime += hours;
          if (entry.type === 'meeting' || entry.multitaskingWith === 'Meeting') {
            meetingMultitaskingTime += hours;
          }
        }
      });
      
      const totalHours = entries.reduce((sum, e) => sum + e.duration / 3600000, 0);
      const meetingHours = entries.filter(e => e.type === 'meeting' || e.category === 'Meeting')
        .reduce((sum, e) => sum + e.duration / 3600000, 0);
      
      multiTaskingAnalysis.push({
        Date: date,
        'Total Hours': totalHours.toFixed(2),
        'Meeting Hours': meetingHours.toFixed(2),
        'Multi-tasking Hours': totalMultitaskingTime.toFixed(2),
        'Meeting Multi-tasking Hours': meetingMultitaskingTime.toFixed(2),
        'Multi-tasking %': totalHours > 0 ? ((totalMultitaskingTime / totalHours) * 100).toFixed(1) + '%' : '0%',
        'Meeting Efficiency': meetingHours > 0 ? 
          ((meetingMultitaskingTime / meetingHours) * 100).toFixed(1) + '% multi-tasked' : 'N/A'
      });
    });
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add sheets
    const entriesSheet = XLSX.utils.json_to_sheet(allEntries);
    XLSX.utils.book_append_sheet(wb, entriesSheet, 'All Time Entries');
    
    const analysisSheet = XLSX.utils.json_to_sheet(multiTaskingAnalysis);
    XLSX.utils.book_append_sheet(wb, analysisSheet, 'Multi-tasking Analysis');
    
    // Download
    const filename = `TimeTracker_AllData_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    showSuccess('dataSuccess');
  });
}

// Create backup (JSON format)
function createBackup() {
  chrome.storage.local.get(null, (data) => {
    const backup = {
      version: '2.2.0',
      timestamp: new Date().toISOString(),
      data: data
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TimeTracker_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccess('dataSuccess');
  });
}

// Import data
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const backup = JSON.parse(event.target.result);
      
      if (!backup.data) {
        throw new Error('Invalid backup file');
      }
      
      if (!confirm('This will replace all existing data. Continue?')) {
        return;
      }
      
      chrome.storage.local.clear(() => {
        chrome.storage.local.set(backup.data, () => {
          loadStatistics();
          loadCategories();
          loadQuickActions();
          loadExportSettings();
          loadMultitaskingSettings();
          loadAutoTrackingSettings();
          loadAccountStatus();
          showSuccess('dataSuccess');
          alert('Data imported successfully!');
        });
      });
    } catch (error) {
      alert('Failed to import data: ' + error.message);
    }
  };
  
  reader.readAsText(file);
  e.target.value = ''; // Reset file input
}

// Clear all data
function clearAllData() {
  if (!confirm('This will permanently delete ALL your time tracking data. Are you sure?')) return;
  if (!confirm('This action cannot be undone. Please confirm again.')) return;
  
  chrome.storage.local.clear(() => {
    // Restore default categories
    const defaultCategories = [
      'Email', 'Meeting', 'Project Work', 'Admin', 
      'Break', 'Training', 'Planning', 'Other'
    ];
    
    chrome.storage.local.set({ 
      categories: defaultCategories,
      quickActions: defaultCategories.slice(0, 6)
    }, () => {
      loadStatistics();
      loadCategories();
      loadQuickActions();
      loadAccountStatus();
      alert('All data has been cleared');
    });
  });
}

// Show success message
function showSuccess(elementId) {
  const element = document.getElementById(elementId);
  element.classList.add('show');
  setTimeout(() => {
    element.classList.remove('show');
  }, 3000);
}

// Save categories order after drag and drop
window.addEventListener('dragend', function() {
  const categoryItems = document.querySelectorAll('.category-item');
  const categories = Array.from(categoryItems).map(item => 
    item.querySelector('.category-name').textContent
  );
  
  chrome.storage.local.set({ categories }, () => {
    loadQuickActions(); // Refresh quick actions with new order
  });
});