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
  document.getElementById('saveClientIdBtn').addEventListener('click', saveClientId);
  document.getElementById('saveQuickActionsBtn').addEventListener('click', saveQuickActions);
  
  // Add drag and drop for category reordering
  setupCategoryDragDrop();
}

function loadSettings() {
  chrome.storage.local.get(['categories', 'exportSettings', 'clientId', 'quickActions'], (result) => {
    const categories = result.categories || defaultCategories;
    displayCategories(categories);
    displayQuickActions(categories, result.quickActions);
    
    if (result.exportSettings) {
      document.getElementById('dateRangeSelect').value = result.exportSettings.dateRange || 'week';
    }
    
    if (result.clientId) {
      document.getElementById('clientIdInput').value = result.clientId;
    }
  });
}

function displayCategories(categories) {
  const list = document.getElementById('categoryList');
  list.innerHTML = categories.map((cat, index) => `
    <li class="category-item" draggable="true" data-index="${index}">
      <span class="drag-handle" style="cursor: move; margin-right: 10px;">☰</span>
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
  
  // Re-setup drag and drop
  setupCategoryDragDrop();
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
        displayQuickActions(categories, null); // Refresh quick actions list
        input.value = '';
        showSuccess('categorySuccess');
      });
    }
  });
}

function removeCategory(index) {
  chrome.storage.local.get(['categories', 'quickActions'], (result) => {
    const categories = result.categories || defaultCategories;
    const removedCategory = categories[index];
    categories.splice(index, 1);
    
    // Also remove from quick actions if present
    let quickActions = result.quickActions || [];
    quickActions = quickActions.filter(qa => qa !== removedCategory);
    
    chrome.storage.local.set({ categories, quickActions }, () => {
      displayCategories(categories);
      displayQuickActions(categories, quickActions);
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

// Save client ID
function saveClientId() {
  const clientId = document.getElementById('clientIdInput').value.trim();
  
  if (!clientId) {
    alert('Please enter a valid Client ID');
    return;
  }
  
  chrome.storage.local.set({ clientId }, () => {
    // Send message to background script to update client ID
    chrome.runtime.sendMessage({ action: 'updateClientId', clientId }, (response) => {
      if (response && response.success) {
        showSuccess('categorySuccess');
        alert('Client ID saved! You may need to reconnect to Outlook.');
      }
    });
  });
}

// Setup drag and drop for category reordering
function setupCategoryDragDrop() {
  const list = document.getElementById('categoryList');
  let draggedItem = null;
  
  list.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('category-item')) {
      draggedItem = e.target;
      e.target.style.opacity = '0.5';
      e.target.classList.add('dragging');
    }
  });
  
  list.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('category-item')) {
      e.target.style.opacity = '';
      e.target.classList.remove('dragging');
    }
  });
  
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(list, e.clientY);
    if (afterElement == null) {
      list.appendChild(draggedItem);
    } else {
      list.insertBefore(draggedItem, afterElement);
    }
  });
  
  list.addEventListener('drop', (e) => {
    e.preventDefault();
    
    // Save new order
    const newOrder = [];
    document.querySelectorAll('.category-item span:not(.drag-handle):not(:last-child)').forEach(span => {
      newOrder.push(span.textContent);
    });
    
    chrome.storage.local.set({ categories: newOrder }, () => {
      // Refresh quick actions with new order
      chrome.storage.local.get(['quickActions'], (result) => {
        displayQuickActions(newOrder, result.quickActions);
      });
      showSuccess('categorySuccess');
    });
  });
}

// Get element after which to insert dragged item
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

// Display quick actions checkboxes
function displayQuickActions(categories, selectedActions) {
  const selected = selectedActions || categories.slice(0, 6);
  const container = document.getElementById('quickActionsList');
  
  container.innerHTML = categories.map(cat => `
    <label style="display: block; margin: 5px 0;">
      <input type="checkbox" value="${cat}" ${selected.includes(cat) ? 'checked' : ''}>
      ${cat}
    </label>
  `).join('');
}

// Save quick actions selection
function saveQuickActions() {
  const checkboxes = document.querySelectorAll('#quickActionsList input[type="checkbox"]:checked');
  const selected = Array.from(checkboxes).map(cb => cb.value);
  
  if (selected.length > 6) {
    alert('Please select no more than 6 quick actions');
    return;
  }
  
  if (selected.length === 0) {
    alert('Please select at least one quick action');
    return;
  }
  
  chrome.storage.local.set({ quickActions: selected }, () => {
    showSuccess('quickActionSuccess');
  });
}