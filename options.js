// Complete options.js - Settings Page Logic with Goals and Deliverables Support
// Version 2.4.0 - With Completion Features

// Global variables
let currentEditingGoal = null;
let draggedDeliverable = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setupTabNavigation();
  loadStatistics();
  loadAccountStatus();
  loadGoals();
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

// Setup tab navigation
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      
      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(`${targetTab}Tab`).classList.add('active');
    });
  });
}

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

// Load and display goals with completion support
function loadGoals() {
  chrome.storage.local.get(['goals', 'deliverables', 'timeEntries'], (result) => {
    const goals = result.goals || [];
    const deliverables = result.deliverables || [];
    const timeEntries = result.timeEntries || {};
    
    // Always check the current state of the checkbox
    const showCompletedDeliverables = document.getElementById('showCompletedDeliverables').checked;
    
    // Separate active and completed goals
    const activeGoals = goals.filter(g => !g.completed);
    const completedGoals = goals.filter(g => g.completed);
    
    // Calculate time spent on each goal
    const goalTimeSpent = {};
    const deliverableTimeSpent = {};
    
    // Calculate today's time for daily targets
    const today = new Date().toDateString();
    const todayEntries = timeEntries[today] || [];
    const todayGoalTime = {};
    
    Object.values(timeEntries).forEach(dayEntries => {
      dayEntries.forEach(entry => {
        if (entry.deliverableId) {
          deliverableTimeSpent[entry.deliverableId] = 
            (deliverableTimeSpent[entry.deliverableId] || 0) + entry.duration;
          
          const deliverable = deliverables.find(d => d.id === entry.deliverableId);
          if (deliverable && deliverable.goalId) {
            goalTimeSpent[deliverable.goalId] = 
              (goalTimeSpent[deliverable.goalId] || 0) + entry.duration;
          }
        }
      });
    });
    
    // Calculate today's goal time
    todayEntries.forEach(entry => {
      if (entry.deliverableId) {
        const deliverable = deliverables.find(d => d.id === entry.deliverableId);
        if (deliverable && deliverable.goalId) {
          todayGoalTime[deliverable.goalId] = 
            (todayGoalTime[deliverable.goalId] || 0) + entry.duration;
        }
      }
    });
    
    // Display active goals
    const goalsList = document.getElementById('goalsList');
    if (activeGoals.length === 0) {
      goalsList.innerHTML = '<p style="text-align: center; color: #605e5c; padding: 20px;">No active goals. Click "Add New Goal" to get started!</p>';
    } else {
      goalsList.innerHTML = activeGoals.map(goal => {
        const goalDeliverables = deliverables.filter(d => 
          d.goalId === goal.id && (showCompletedDeliverables || !d.completed)
        );
        const activeDeliverables = goalDeliverables.filter(d => !d.completed);
        const completedDeliverables = goalDeliverables.filter(d => d.completed);
        const allGoalDeliverables = deliverables.filter(d => d.goalId === goal.id);
        const totalDeliverables = allGoalDeliverables.length;
        const completedCount = allGoalDeliverables.filter(d => d.completed).length;
        const totalTimeSpent = (goalTimeSpent[goal.id] || 0) / 3600000;
        const todayTimeSpent = (todayGoalTime[goal.id] || 0) / 3600000;
        const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
        const daysRemaining = targetDate ? Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
        
        return `
          <div class="goal-item" data-goal-id="${goal.id}">
            <div class="goal-header">
              <div class="goal-name">
                ${goal.name}
                ${completedCount > 0 ? 
                  `<span class="goal-completion-stats">(${completedCount}/${totalDeliverables} deliverables completed)</span>` : 
                  ''}
              </div>
              <div class="goal-actions">
                <button class="complete-btn complete-goal-btn" data-goal-id="${goal.id}">Complete</button>
                <button class="button secondary edit-goal-btn" data-goal-id="${goal.id}">Edit</button>
                <button class="button danger delete-goal-btn" data-goal-id="${goal.id}">Delete</button>
              </div>
            </div>
            <div class="goal-impact">${goal.impact}</div>
            <div class="goal-details">
              <div>Total Time: <strong>${totalTimeSpent.toFixed(1)}h</strong></div>
              <div>
                ${goal.dailyTarget ? `Daily Target: <strong>${goal.dailyTarget}h</strong>` : 'No daily target'}
              </div>
              <div>Active Deliverables: <strong>${activeDeliverables.length}</strong></div>
              <div>
                ${targetDate ? 
                  (daysRemaining >= 0 ? 
                    `Due in <strong>${daysRemaining} days</strong>` : 
                    `<strong style="color: #d83b01;">Overdue by ${Math.abs(daysRemaining)} days</strong>`) : 
                  'No target date'}
              </div>
            </div>
            ${goal.dailyTarget ? `
              <div class="goal-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${Math.min((todayTimeSpent / goal.dailyTarget) * 100, 100)}%"></div>
                </div>
                <div class="progress-text">Today's Progress: ${todayTimeSpent.toFixed(1)}h / ${goal.dailyTarget}h (${Math.round((todayTimeSpent / goal.dailyTarget) * 100)}%)</div>
              </div>
            ` : ''}
            <div class="deliverables-list" data-goal-id="${goal.id}">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong>
                  Deliverables: 
                  ${showCompletedDeliverables ? 
                    `${goalDeliverables.length} total` : 
                    `${activeDeliverables.length} active${completedDeliverables.length > 0 ? ` (${completedCount} completed hidden)` : ''}`
                  }
                </strong>
                <button class="button success add-deliverable-btn" data-goal-id="${goal.id}" style="font-size: 12px; padding: 4px 10px;">
                  + Add Deliverable
                </button>
              </div>
              <div class="add-deliverable-form" id="addDeliverableForm_${goal.id}">
                <input type="text" placeholder="Deliverable name" id="newDeliverableName_${goal.id}">
                <div style="display: flex; gap: 5px; margin-top: 5px;">
                  <button class="button success save-deliverable-btn" data-goal-id="${goal.id}" style="font-size: 12px; padding: 4px 10px;">Save</button>
                  <button class="button secondary cancel-deliverable-btn" data-goal-id="${goal.id}" style="font-size: 12px; padding: 4px 10px;">Cancel</button>
                </div>
              </div>
              ${goalDeliverables.length === 0 ? 
                '<p style="color: #605e5c; font-size: 12px; margin: 10px 0;">No deliverables to show</p>' :
                goalDeliverables.map(deliverable => {
                  const delTime = (deliverableTimeSpent[deliverable.id] || 0) / 3600000;
                  const completedClass = deliverable.completed ? 'completed-deliverable' : '';
                  return `
                    <div class="deliverable-item ${completedClass}" data-deliverable-id="${deliverable.id}" ${!deliverable.completed ? 'draggable="true"' : ''}>
                      <div class="deliverable-name">
                        ${deliverable.name} 
                        <span style="color: #605e5c; font-size: 11px;">(${delTime.toFixed(1)}h)</span>
                      </div>
                      <div class="deliverable-actions">
                        ${deliverable.completed ? 
                          `<button class="uncomplete-btn uncomplete-deliverable-btn" data-deliverable-id="${deliverable.id}">Reopen</button>` :
                          `<button class="complete-btn complete-deliverable-btn" data-deliverable-id="${deliverable.id}">Complete</button>`
                        }
                        <button class="button secondary edit-deliverable-btn" data-deliverable-id="${deliverable.id}" data-name="${deliverable.name}">Edit</button>
                        <button class="button danger delete-deliverable-btn" data-deliverable-id="${deliverable.id}">Delete</button>
                      </div>
                    </div>
                    ${deliverable.completedAt ? `<div class="completion-date">Completed: ${new Date(deliverable.completedAt).toLocaleDateString()}</div>` : ''}
                  `;
                }).join('')
              }
            </div>
          </div>
        `;
      }).join('');
    }
    
    // Display completed goals section (always check if there are completed goals)
    const completedGoalsSection = document.getElementById('completedGoalsSection');
    const showCompletedGoals = document.getElementById('showCompletedGoals').checked;
    
    // Show/hide the section based on checkbox and whether there are completed goals
    if (completedGoals.length > 0) {
      completedGoalsSection.style.display = showCompletedGoals ? 'block' : 'none';
    } else {
      completedGoalsSection.style.display = 'none';
    }
    
    // Display completed goals
    const completedGoalsList = document.getElementById('completedGoalsList');
    if (completedGoals.length > 0) {
      completedGoalsList.innerHTML = completedGoals.map(goal => {
        const totalTimeSpent = (goalTimeSpent[goal.id] || 0) / 3600000;
        const goalDeliverables = deliverables.filter(d => d.goalId === goal.id);
        const completedDeliverablesCount = goalDeliverables.filter(d => d.completed).length;
        
        return `
          <div class="goal-item completed-goal" data-goal-id="${goal.id}">
            <div class="goal-header">
              <div class="goal-name">
                ${goal.name}
                <span class="goal-completion-stats">(${completedDeliverablesCount}/${goalDeliverables.length} deliverables completed)</span>
              </div>
              <div class="goal-actions">
                <button class="uncomplete-btn uncomplete-goal-btn" data-goal-id="${goal.id}">Reopen</button>
                <button class="button danger delete-goal-btn" data-goal-id="${goal.id}">Delete</button>
              </div>
            </div>
            <div class="goal-impact">${goal.impact}</div>
            <div class="completion-date">Completed: ${new Date(goal.completedAt).toLocaleDateString()}</div>
            <div class="goal-details">
              <div>Total Time: <strong>${totalTimeSpent.toFixed(1)}h</strong></div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      completedGoalsList.innerHTML = '<p style="color: #605e5c; font-size: 13px;">No completed goals yet</p>';
    }
    
    // Display unassigned deliverables
    const unassignedDeliverables = deliverables.filter(d => 
      !d.goalId && (showCompletedDeliverables || !d.completed)
    );
    const unassignedList = document.getElementById('unassignedDeliverables');
    
    const totalUnassigned = deliverables.filter(d => !d.goalId).length;
    const completedUnassigned = deliverables.filter(d => !d.goalId && d.completed).length;
    
    if (unassignedDeliverables.length === 0) {
      if (totalUnassigned > 0 && !showCompletedDeliverables) {
        unassignedList.innerHTML = `<p style="color: #605e5c; font-size: 13px;">All ${totalUnassigned} unassigned deliverables are completed (hidden)</p>`;
      } else {
        unassignedList.innerHTML = '<p style="color: #605e5c; font-size: 13px;">All deliverables are assigned to goals</p>';
      }
    } else {
      unassignedList.innerHTML = unassignedDeliverables.map(deliverable => {
        const delTime = (deliverableTimeSpent[deliverable.id] || 0) / 3600000;
        const completedClass = deliverable.completed ? 'completed-deliverable' : '';
        return `
          <div class="deliverable-item ${completedClass}" data-deliverable-id="${deliverable.id}" ${!deliverable.completed ? 'draggable="true"' : ''}>
            <div class="deliverable-name">
              ${deliverable.name} 
              <span style="color: #605e5c; font-size: 11px;">(${delTime.toFixed(1)}h)</span>
            </div>
            <div class="deliverable-actions">
              ${deliverable.completed ? 
                `<button class="uncomplete-btn uncomplete-deliverable-btn" data-deliverable-id="${deliverable.id}">Reopen</button>` :
                `<button class="complete-btn complete-deliverable-btn" data-deliverable-id="${deliverable.id}">Complete</button>`
              }
              <button class="button secondary edit-deliverable-btn" data-deliverable-id="${deliverable.id}" data-name="${deliverable.name}">Edit</button>
              <button class="button danger delete-deliverable-btn" data-deliverable-id="${deliverable.id}">Delete</button>
            </div>
          </div>
          ${deliverable.completedAt ? `<div class="completion-date">Completed: ${new Date(deliverable.completedAt).toLocaleDateString()}</div>` : ''}
        `;
      }).join('');
    }
    
    // Setup event listeners for goals and deliverables
    setupGoalEventListeners();
    setupDragAndDropDeliverables();
  });
}

// Setup event listeners for goal-related actions
function setupGoalEventListeners() {
  // Edit goal buttons
  document.querySelectorAll('.edit-goal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const goalId = e.target.dataset.goalId;
      editGoal(goalId);
    });
  });
  
  // Delete goal buttons
  document.querySelectorAll('.delete-goal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const goalId = e.target.dataset.goalId;
      deleteGoal(goalId);
    });
  });
  
  // Complete goal buttons
  document.querySelectorAll('.complete-goal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const goalId = e.target.dataset.goalId;
      if (confirm('Mark this goal as completed? It will be moved to the completed section.')) {
        completeGoal(goalId);
      }
    });
  });
  
  // Uncomplete goal buttons
  document.querySelectorAll('.uncomplete-goal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const goalId = e.target.dataset.goalId;
      uncompleteGoal(goalId);
    });
  });
  
  // Add deliverable buttons
  document.querySelectorAll('.add-deliverable-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const goalId = e.target.dataset.goalId;
      const form = document.getElementById(`addDeliverableForm_${goalId}`);
      form.classList.add('active');
      document.getElementById(`newDeliverableName_${goalId}`).focus();
    });
  });
  
  // Save deliverable buttons
  document.querySelectorAll('.save-deliverable-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const goalId = e.target.dataset.goalId;
      const input = document.getElementById(`newDeliverableName_${goalId}`);
      const name = input.value.trim();
      
      if (name) {
        addDeliverable(name, goalId);
        input.value = '';
        document.getElementById(`addDeliverableForm_${goalId}`).classList.remove('active');
      }
    });
  });
  
  // Cancel deliverable buttons
  document.querySelectorAll('.cancel-deliverable-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const goalId = e.target.dataset.goalId;
      document.getElementById(`newDeliverableName_${goalId}`).value = '';
      document.getElementById(`addDeliverableForm_${goalId}`).classList.remove('active');
    });
  });
  
  // Edit deliverable buttons
  document.querySelectorAll('.edit-deliverable-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const deliverableId = e.target.dataset.deliverableId;
      const currentName = e.target.dataset.name;
      const newName = prompt('Edit deliverable name:', currentName);
      
      if (newName && newName.trim() && newName !== currentName) {
        editDeliverable(deliverableId, newName.trim());
      }
    });
  });
  
  // Delete deliverable buttons
  document.querySelectorAll('.delete-deliverable-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const deliverableId = e.target.dataset.deliverableId;
      if (confirm('Delete this deliverable? Time entries will be preserved but no longer linked to this deliverable.')) {
        deleteDeliverable(deliverableId);
      }
    });
  });
  
  // Complete deliverable buttons
  document.querySelectorAll('.complete-deliverable-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const deliverableId = e.target.dataset.deliverableId;
      if (confirm('Mark this deliverable as completed?')) {
        completeDeliverable(deliverableId);
      }
    });
  });
  
  // Uncomplete deliverable buttons
  document.querySelectorAll('.uncomplete-deliverable-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const deliverableId = e.target.dataset.deliverableId;
      uncompleteDeliverable(deliverableId);
    });
  });
  
  // Enter key to save deliverable
  document.querySelectorAll('[id^="newDeliverableName_"]').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const goalId = input.id.split('_')[1];
        const saveBtn = document.querySelector(`.save-deliverable-btn[data-goal-id="${goalId}"]`);
        if (saveBtn) saveBtn.click();
      }
    });
  });
}

// Setup drag and drop for deliverables
function setupDragAndDropDeliverables() {
  const deliverableItems = document.querySelectorAll('.deliverable-item[draggable="true"]');
  const deliverableLists = document.querySelectorAll('.deliverables-list');
  const unassignedArea = document.getElementById('unassignedDeliverables');
  
  deliverableItems.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedDeliverable = {
        id: item.dataset.deliverableId,
        element: item
      };
      item.style.opacity = '0.5';
    });
    
    item.addEventListener('dragend', (e) => {
      item.style.opacity = '';
      draggedDeliverable = null;
    });
  });
  
  // Make goal deliverable lists droppable
  deliverableLists.forEach(list => {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      list.style.background = '#e3f2fd';
    });
    
    list.addEventListener('dragleave', (e) => {
      list.style.background = '';
    });
    
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      list.style.background = '';
      
      if (draggedDeliverable) {
        const goalId = list.dataset.goalId;
        assignDeliverableToGoal(draggedDeliverable.id, goalId);
      }
    });
  });
  
  // Make unassigned area droppable
  if (unassignedArea) {
    unassignedArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      unassignedArea.style.background = '#f8f9fa';
    });
    
    unassignedArea.addEventListener('dragleave', (e) => {
      unassignedArea.style.background = '';
    });
    
    unassignedArea.addEventListener('drop', (e) => {
      e.preventDefault();
      unassignedArea.style.background = '';
      
      if (draggedDeliverable) {
        assignDeliverableToGoal(draggedDeliverable.id, null);
      }
    });
  }
}

// Complete goal
function completeGoal(goalId) {
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    const goalIndex = goals.findIndex(g => g.id === goalId);
    
    if (goalIndex !== -1) {
      goals[goalIndex].completed = true;
      goals[goalIndex].completedAt = new Date().toISOString();
      
      chrome.storage.local.set({ goals }, () => {
        loadGoals();
        showSuccess('goalsSuccess');
      });
    }
  });
}

// Uncomplete goal
function uncompleteGoal(goalId) {
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    const goalIndex = goals.findIndex(g => g.id === goalId);
    
    if (goalIndex !== -1) {
      delete goals[goalIndex].completed;
      delete goals[goalIndex].completedAt;
      
      chrome.storage.local.set({ goals }, () => {
        loadGoals();
        showSuccess('goalsSuccess');
      });
    }
  });
}

// Complete deliverable
function completeDeliverable(deliverableId) {
  chrome.storage.local.get(['deliverables'], (result) => {
    const deliverables = result.deliverables || [];
    const deliverableIndex = deliverables.findIndex(d => d.id === deliverableId);
    
    if (deliverableIndex !== -1) {
      deliverables[deliverableIndex].completed = true;
      deliverables[deliverableIndex].completedAt = new Date().toISOString();
      
      chrome.storage.local.set({ deliverables }, () => {
        loadGoals();
        showSuccess('goalsSuccess');
      });
    }
  });
}

// Uncomplete deliverable
function uncompleteDeliverable(deliverableId) {
  chrome.storage.local.get(['deliverables'], (result) => {
    const deliverables = result.deliverables || [];
    const deliverableIndex = deliverables.findIndex(d => d.id === deliverableId);
    
    if (deliverableIndex !== -1) {
      delete deliverables[deliverableIndex].completed;
      delete deliverables[deliverableIndex].completedAt;
      
      chrome.storage.local.set({ deliverables }, () => {
        loadGoals();
        showSuccess('goalsSuccess');
      });
    }
  });
}

// Add new goal
function addGoal() {
  currentEditingGoal = null;
  document.getElementById('goalModalTitle').textContent = 'Add New Goal';
  document.getElementById('goalName').value = '';
  document.getElementById('goalImpact').value = '';
  document.getElementById('goalDailyTarget').value = '';
  document.getElementById('goalTargetDate').value = '';
  document.getElementById('goalModal').classList.add('active');
  document.getElementById('goalName').focus();
}

// Edit existing goal
function editGoal(goalId) {
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    const goal = goals.find(g => g.id === goalId);
    
    if (goal) {
      currentEditingGoal = goalId;
      document.getElementById('goalModalTitle').textContent = 'Edit Goal';
      document.getElementById('goalName').value = goal.name;
      document.getElementById('goalImpact').value = goal.impact;
      document.getElementById('goalDailyTarget').value = goal.dailyTarget || '';
      document.getElementById('goalTargetDate').value = goal.targetDate || '';
      document.getElementById('goalModal').classList.add('active');
      document.getElementById('goalName').focus();
    }
  });
}

// Save goal
function saveGoal() {
  const name = document.getElementById('goalName').value.trim();
  const impact = document.getElementById('goalImpact').value.trim();
  const dailyTarget = parseFloat(document.getElementById('goalDailyTarget').value) || 0;
  const targetDate = document.getElementById('goalTargetDate').value;
  
  if (!name || !impact) {
    alert('Please provide both goal name and impact statement');
    return;
  }
  
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    
    if (currentEditingGoal) {
      // Update existing goal
      const goalIndex = goals.findIndex(g => g.id === currentEditingGoal);
      if (goalIndex !== -1) {
        goals[goalIndex] = {
          ...goals[goalIndex],
          name,
          impact,
          dailyTarget,
          targetDate
        };
      }
    } else {
      // Add new goal
      const newGoal = {
        id: `goal_${Date.now()}`,
        name,
        impact,
        dailyTarget,
        targetDate,
        createdAt: new Date().toISOString()
      };
      goals.push(newGoal);
    }
    
    chrome.storage.local.set({ goals }, () => {
      loadGoals();
      document.getElementById('goalModal').classList.remove('active');
      showSuccess('goalsSuccess');
    });
  });
}

// Delete goal
function deleteGoal(goalId) {
  if (!confirm('Delete this goal? Deliverables will become unassigned but time entries will be preserved.')) {
    return;
  }
  
  chrome.storage.local.get(['goals', 'deliverables'], (result) => {
    let goals = result.goals || [];
    let deliverables = result.deliverables || [];
    
    // Remove goal
    goals = goals.filter(g => g.id !== goalId);
    
    // Unassign deliverables from this goal
    deliverables = deliverables.map(d => {
      if (d.goalId === goalId) {
        return { ...d, goalId: null };
      }
      return d;
    });
    
    chrome.storage.local.set({ goals, deliverables }, () => {
      loadGoals();
      showSuccess('goalsSuccess');
    });
  });
}

// Add deliverable
function addDeliverable(name, goalId) {
  chrome.storage.local.get(['deliverables'], (result) => {
    const deliverables = result.deliverables || [];
    
    const newDeliverable = {
      id: `deliverable_${Date.now()}`,
      name,
      goalId,
      createdAt: new Date().toISOString(),
      completed: false
    };
    
    deliverables.push(newDeliverable);
    
    chrome.storage.local.set({ deliverables }, () => {
      loadGoals();
      showSuccess('goalsSuccess');
    });
  });
}

// Edit deliverable
function editDeliverable(deliverableId, newName) {
  chrome.storage.local.get(['deliverables'], (result) => {
    const deliverables = result.deliverables || [];
    const index = deliverables.findIndex(d => d.id === deliverableId);
    
    if (index !== -1) {
      deliverables[index].name = newName;
      chrome.storage.local.set({ deliverables }, () => {
        loadGoals();
        showSuccess('goalsSuccess');
      });
    }
  });
}

// Delete deliverable
function deleteDeliverable(deliverableId) {
  chrome.storage.local.get(['deliverables'], (result) => {
    let deliverables = result.deliverables || [];
    deliverables = deliverables.filter(d => d.id !== deliverableId);
    
    chrome.storage.local.set({ deliverables }, () => {
      loadGoals();
      showSuccess('goalsSuccess');
    });
  });
}

// Assign deliverable to goal
function assignDeliverableToGoal(deliverableId, goalId) {
  chrome.storage.local.get(['deliverables'], (result) => {
    const deliverables = result.deliverables || [];
    const index = deliverables.findIndex(d => d.id === deliverableId);
    
    if (index !== -1) {
      deliverables[index].goalId = goalId;
      chrome.storage.local.set({ deliverables }, () => {
        loadGoals();
        showSuccess('goalsSuccess');
      });
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
  
  // Goals
  document.getElementById('addGoalBtn').addEventListener('click', addGoal);
  document.getElementById('saveGoalBtn').addEventListener('click', saveGoal);
  document.getElementById('cancelGoalBtn').addEventListener('click', () => {
    document.getElementById('goalModal').classList.remove('active');
  });
  document.getElementById('closeGoalModal').addEventListener('click', () => {
    document.getElementById('goalModal').classList.remove('active');
  });
  
  // Show/hide completed goals - now checks the initial state
  const showCompletedGoalsCheckbox = document.getElementById('showCompletedGoals');
  const completedGoalsSection = document.getElementById('completedGoalsSection');
  
  // Set initial visibility based on checkbox state (checked by default)
  completedGoalsSection.style.display = showCompletedGoalsCheckbox.checked ? 'block' : 'none';
  
  showCompletedGoalsCheckbox.addEventListener('change', (e) => {
    completedGoalsSection.style.display = e.target.checked ? 'block' : 'none';
  });
  
  // Show/hide completed deliverables
  document.getElementById('showCompletedDeliverables').addEventListener('change', (e) => {
    loadGoals(); // Reload to show/hide completed items
  });
  
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
  
  // Modal close on outside click
  document.getElementById('goalModal').addEventListener('click', (e) => {
    if (e.target.id === 'goalModal') {
      document.getElementById('goalModal').classList.remove('active');
    }
  });
// Social sharing buttons
document.getElementById('copyLinkBtn')?.addEventListener('click', () => {
  const link = 'https://github.com/Maniwar/time_tracker';
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.getElementById('copyLinkBtn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.style.background = '#107c10';
    btn.style.color = 'white';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
  });
});

// LinkedIn Share
document.getElementById('shareLinkedIn')?.addEventListener('click', () => {
  const url = 'https://github.com/Maniwar/time_tracker';
  const text = `Just discovered Universal Time Tracker - a free Chrome extension that helped me prove we needed more headcount with actual data! 

It tracks multi-tasking during meetings (we all do it), auto-syncs with calendars, and exports reports that managers understand.

No premium tiers, no locked features - completely free forever.`;
  
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
  window.open(linkedInUrl, '_blank', 'width=600,height=600');
});

// Twitter/X Share
document.getElementById('shareTwitter')?.addEventListener('click', () => {
  const text = `Found a time tracker that actually admits we multitask during meetings 😅

Universal Time Tracker helped me prove we needed 2 more devs - and we got them!

Free forever, no BS: `;
  const url = 'https://github.com/Maniwar/time_tracker';
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=productivity,timetracking,developertools`;
  window.open(twitterUrl, '_blank', 'width=600,height=400');
});

// Reddit Share
document.getElementById('shareReddit')?.addEventListener('click', () => {
  const url = 'https://github.com/Maniwar/time_tracker';
  const title = 'Universal Time Tracker - Free Chrome extension that helped me get headcount approved';
  const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  window.open(redditUrl, '_blank', 'width=900,height=600');
});

// Facebook Share
document.getElementById('shareFacebook')?.addEventListener('click', () => {
  const url = 'https://github.com/Maniwar/time_tracker';
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(facebookUrl, '_blank', 'width=600,height=400');
});

// Email Share
document.getElementById('shareEmail')?.addEventListener('click', () => {
  const subject = 'Check out Universal Time Tracker - It helped me get headcount!';
  const body = `Hey,

I've been using Universal Time Tracker and it's been a game-changer for proving we need more people on the team.

Key features:
- Tracks multi-tasking during meetings (finally, honest data!)
- Auto-syncs with Google Calendar and Outlook
- Exports reports that actually make sense to managers
- Completely free forever (no premium BS)

The multi-tasking data was key - it showed we're in meetings 60% of the time but multitasking through 40% of them because they're not relevant.

Check it out: https://github.com/Maniwar/time_tracker

Thought you might find it useful for your team too!`;
  
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
});

// Success Story Share (Special LinkedIn post)
document.getElementById('shareSuccess')?.addEventListener('click', () => {
  const url = 'https://github.com/Maniwar/time_tracker';
  const text = `🎉 SUCCESS STORY: We just got 2 additional headcount approved!

How? Data beats opinions every time.

Using Universal Time Tracker, I showed leadership:
📊 67% of our time was in meetings
⚡ 40% of meeting time involved multitasking
🔥 Core project work got only 2 hours/day
📈 We were 6 weeks behind due to context switching

The result? Immediate approval for 2 new developers.

The best part? This tool is completely free. No premium tiers. No locked features.

If you're struggling to justify headcount, you need this data.`;
  
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
  window.open(linkedInUrl, '_blank', 'width=600,height=600');
  
  // Also track this as a success metric
  chrome.storage.local.get(['successStories'], (result) => {
    const count = (result.successStories || 0) + 1;
    chrome.storage.local.set({ successStories: count });
  });
});
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

// Export all data to Excel (updated to include completion status)
function exportAllData() {
  chrome.storage.local.get(['timeEntries', 'deliverables', 'goals'], (result) => {
    const timeEntries = result.timeEntries || {};
    const deliverables = result.deliverables || [];
    const goals = result.goals || [];
    
    if (Object.keys(timeEntries).length === 0) {
      alert('No data to export');
      return;
    }
    
    // Prepare all entries
    const allEntries = [];
    const deliverableAnalysis = [];
    const goalAnalysis = [];
    const multiTaskingAnalysis = [];
    
    // Track totals
    const deliverableTotals = {};
    const goalTotals = {};
    
    Object.keys(timeEntries).forEach(date => {
      const entries = timeEntries[date];
      
      let totalMultitaskingTime = 0;
      let meetingMultitaskingTime = 0;
      
      entries.forEach(entry => {
        const hours = entry.duration / 3600000;
        
        // Find deliverable and goal info
        let deliverableName = '';
        let goalName = '';
        let deliverableCompleted = '';
        let goalCompleted = '';
        
        if (entry.deliverableId) {
          const deliverable = deliverables.find(d => d.id === entry.deliverableId);
          if (deliverable) {
            deliverableName = deliverable.name;
            deliverableCompleted = deliverable.completed ? 'Yes' : 'No';
            
            if (!deliverableTotals[deliverable.id]) {
              deliverableTotals[deliverable.id] = {
                name: deliverable.name,
                completed: deliverable.completed,
                completedAt: deliverable.completedAt,
                totalHours: 0,
                entries: 0
              };
            }
            deliverableTotals[deliverable.id].totalHours += hours;
            deliverableTotals[deliverable.id].entries++;
            
            if (deliverable.goalId) {
              const goal = goals.find(g => g.id === deliverable.goalId);
              if (goal) {
                goalName = goal.name;
                goalCompleted = goal.completed ? 'Yes' : 'No';
                
                if (!goalTotals[goal.id]) {
                  goalTotals[goal.id] = {
                    name: goal.name,
                    impact: goal.impact,
                    completed: goal.completed,
                    completedAt: goal.completedAt,
                    totalHours: 0,
                    entries: 0,
                    deliverables: new Set()
                  };
                }
                goalTotals[goal.id].totalHours += hours;
                goalTotals[goal.id].entries++;
                goalTotals[goal.id].deliverables.add(deliverable.name);
              }
            }
          }
        }
        
        allEntries.push({
          Date: date,
          Type: entry.type || 'task',
          Category: entry.category || entry.subject || 'Other',
          Description: entry.description || entry.subject || '',
          Deliverable: deliverableName,
          'Deliverable Completed': deliverableCompleted,
          Goal: goalName,
          'Goal Completed': goalCompleted,
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
    
    // Create deliverable analysis
    Object.values(deliverableTotals).forEach(deliverable => {
      deliverableAnalysis.push({
        'Deliverable': deliverable.name,
        'Status': deliverable.completed ? 'Completed' : 'Active',
        'Completed Date': deliverable.completedAt ? new Date(deliverable.completedAt).toLocaleDateString() : '',
        'Total Hours': deliverable.totalHours.toFixed(2),
        'Number of Entries': deliverable.entries,
        'Average Session': (deliverable.totalHours / deliverable.entries).toFixed(2) + ' hours'
      });
    });
    
    // Create goal analysis
    Object.values(goalTotals).forEach(goal => {
      goalAnalysis.push({
        'Goal': goal.name,
        'Impact': goal.impact,
        'Status': goal.completed ? 'Completed' : 'Active',
        'Completed Date': goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : '',
        'Total Hours': goal.totalHours.toFixed(2),
        'Number of Entries': goal.entries,
        'Deliverables': Array.from(goal.deliverables).join(', '),
        'Average Session': (goal.totalHours / goal.entries).toFixed(2) + ' hours'
      });
    });
    
    // Add completion summary
    const completionSummary = [{
      'Metric': 'Total Goals',
      'Count': goals.length,
      'Active': goals.filter(g => !g.completed).length,
      'Completed': goals.filter(g => g.completed).length,
      'Completion Rate': goals.length > 0 ? 
        ((goals.filter(g => g.completed).length / goals.length) * 100).toFixed(1) + '%' : '0%'
    }, {
      'Metric': 'Total Deliverables',
      'Count': deliverables.length,
      'Active': deliverables.filter(d => !d.completed).length,
      'Completed': deliverables.filter(d => d.completed).length,
      'Completion Rate': deliverables.length > 0 ? 
        ((deliverables.filter(d => d.completed).length / deliverables.length) * 100).toFixed(1) + '%' : '0%'
    }];
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add sheets
    const entriesSheet = XLSX.utils.json_to_sheet(allEntries);
    XLSX.utils.book_append_sheet(wb, entriesSheet, 'All Time Entries');
    
    if (deliverableAnalysis.length > 0) {
      const deliverableSheet = XLSX.utils.json_to_sheet(deliverableAnalysis);
      XLSX.utils.book_append_sheet(wb, deliverableSheet, 'Deliverable Analysis');
    }
    
    if (goalAnalysis.length > 0) {
      const goalSheet = XLSX.utils.json_to_sheet(goalAnalysis);
      XLSX.utils.book_append_sheet(wb, goalSheet, 'Goal Analysis');
    }
    
    const completionSheet = XLSX.utils.json_to_sheet(completionSummary);
    XLSX.utils.book_append_sheet(wb, completionSheet, 'Completion Summary');
    
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
      version: '2.4.0',
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
          loadGoals();
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
      loadGoals();
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
  if (element) {
    element.classList.add('show');
    setTimeout(() => {
      element.classList.remove('show');
    }, 3000);
  }
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

