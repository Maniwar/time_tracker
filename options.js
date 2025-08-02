const defaultCategories = [
  'Email',
  'Meeting',
  'Project Work',
  'Admin',
  'Break',
  'Training',
  'Planning',
  'Other'
];

document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  setupEventListeners();
  checkAccountStatus();
});

function setupEventListeners() {
  document.getElementById('reconnectBtn').addEventListener('click', reconnectAccount);
  document.getElementById('disconnectBtn').addEventListener('click', disconnectAccount);
  document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('exportAllBtn').addEventListener('click', exportAllData);
  document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
}

function loadSettings() {
  chrome.storage.local.get(['categories', 'exportSettings'], (result) => {
    const categories = result.categories || defaultCategories;
    displayCategories(categories);
    
    if (result.exportSettings) {
      document.getElementById('dateRangeSelect').value = result.exportSettings.dateRange || 'week';
    }
  });
}

function displayCategories(categories) {
  const list = document.getElementById('categoryList');
  list.innerHTML = categories.map((cat, index) => `
    <li class="category-item">
      <span>${cat}</span>
      <button class="button danger remove-category-btn" data-index="${index}">Remove</button>
    </li>
  `).join('');
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-category-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      removeCategory(index);
    });
  });
}

function addCategory() {
  const input = document.getElementById('newCategoryInput');
  const category = input.value.trim();
  
  if (!category) return;
  
  chrome.storage.local.get(['categories'], (result) => {
    const categories = result.categories || defaultCategories;
    if (!categories.includes(category)) {
      categories.push(category);
      chrome.storage.local.set({ categories }, () => {
        displayCategories(categories);
        input.value = '';
        showSuccess('categorySuccess');
      });
    }
  });
}

function removeCategory(index) {
  chrome.storage.local.get(['categories'], (result) => {
    const categories = result.categories || defaultCategories;
    categories.splice(index, 1);
    chrome.storage.local.set({ categories }, () => {
      displayCategories(categories);
      showSuccess('categorySuccess');
    });
  });
}

function saveSettings() {
  const exportSettings = {
    dateRange: document.getElementById('dateRangeSelect').value
  };
  
  chrome.storage.local.set({ exportSettings }, () => {
    showSuccess('categorySuccess');
  });
}

function checkAccountStatus() {
  chrome.storage.local.get(['accessToken'], (result) => {
    const status = document.getElementById('accountStatus');
    if (result.accessToken) {
      status.textContent = 'Connected';
      status.style.color = '#0b6a0b';
    } else {
      status.textContent = 'Not connected';
      status.style.color = '#a80000';
    }
  });
}

function reconnectAccount() {
  chrome.runtime.sendMessage({ action: 'authenticate' }, (response) => {
    if (response.success) {
      checkAccountStatus();
      showSuccess('categorySuccess');
    }
  });
}

function disconnectAccount() {
  if (confirm('Are you sure you want to disconnect your Microsoft account?')) {
    chrome.runtime.sendMessage({ action: 'logout' }, () => {
      checkAccountStatus();
    });
  }
}

function exportAllData() {
  // Check if XLSX library is loaded
  if (typeof XLSX === 'undefined') {
    alert('Excel export library not loaded. Please ensure xlsx.min.js is in your extension folder.\n\nDownload from: https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js\nSave as: xlsx.min.js');
    return;
  }
  
  chrome.storage.local.get(['timeEntries'], (result) => {
    const timeEntries = result.timeEntries || {};
    const allData = [];
    
    Object.keys(timeEntries).forEach(date => {
      timeEntries[date].forEach(entry => {
        allData.push({
          Date: date,
          Type: entry.type,
          Category: entry.category || entry.subject || 'N/A',
          Description: entry.description || entry.subject || '',
          StartTime: new Date(entry.startTime).toLocaleString(),
          EndTime: new Date(entry.endTime).toLocaleString(),
          DurationMinutes: Math.round(entry.duration / 60000),
          DurationHours: (entry.duration / 3600000).toFixed(2)
        });
      });
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(allData);
    XLSX.utils.book_append_sheet(wb, ws, 'All Time Data');
    XLSX.writeFile(wb, `TimeTracker_AllData_${new Date().toISOString().split('T')[0]}.xlsx`);
  });
}

function clearAllData() {
  if (confirm('Are you sure you want to clear all time tracking data? This cannot be undone.')) {
    chrome.storage.local.remove(['timeEntries'], () => {
      alert('All data has been cleared.');
    });
  }
}

function showSuccess(elementId) {
  const element = document.getElementById(elementId);
  element.style.display = 'block';
  setTimeout(() => {
    element.style.display = 'none';
  }, 3000);
}