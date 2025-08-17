// Complete options.js - Fully Refactored with All Features Working
// Version 3.0.0 - Integrated with UnifiedAPIClient and AI Reports

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentEditingGoal = null;
let editingModel = null;
let pageInitialized = false;
let editingTemplateName = null; // Track the original name when editing
// ============================================
// GOAL MANAGEMENT FUNCTIONS
// ============================================

// Add new goal
function addGoal() {
  currentEditingGoal = null;
  document.getElementById('goalModalTitle').textContent = 'Add New Goal';
  document.getElementById('goalName').value = '';
  document.getElementById('goalImpact').value = '';
  document.getElementById('goalDailyTarget').value = '';
  document.getElementById('goalTargetDate').value = '';
  
  const modal = document.getElementById('goalModal');
  modal.classList.add('active');
  
  modal.offsetHeight; // Force browser recalculation
  
  setTimeout(() => {
    document.getElementById('goalName').focus();
  }, 100);
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
      setTimeout(() => {
        document.getElementById('goalName').focus();
      }, 100);
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
    
    goals = goals.filter(g => g.id !== goalId);
    
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

// Save goals sort order
function saveGoalsSortOrder() {
  const goalElements = document.querySelectorAll('#goalsList .goal-item');
  const sortedIds = Array.from(goalElements).map(el => el.dataset.goalId);
  
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    
    const sortedGoals = sortedIds.map(id => goals.find(g => g.id === id)).filter(Boolean);
    
    goals.forEach(goal => {
      if (!sortedGoals.find(g => g.id === goal.id)) {
        sortedGoals.push(goal);
      }
    });
    
    chrome.storage.local.set({ goals: sortedGoals }, () => {
      showSuccess('goalsSuccess');
    });
  });
}

// Export goals and deliverables data
function exportGoalsAndDeliverables() {
  chrome.storage.local.get(['goals', 'deliverables', 'timeEntries'], (result) => {
    const goals = result.goals || [];
    const deliverables = result.deliverables || [];
    const timeEntries = result.timeEntries || {};
    
    if (goals.length === 0 && deliverables.length === 0) {
      alert('No goals or deliverables to export');
      return;
    }
    
    const deliverableTimeSpent = {};
    const goalTimeSpent = {};
    
    Object.values(timeEntries).forEach(dayEntries => {
      dayEntries.forEach(entry => {
        if (entry.deliverableId) {
          const hours = entry.duration / 3600000;
          deliverableTimeSpent[entry.deliverableId] = 
            (deliverableTimeSpent[entry.deliverableId] || 0) + hours;
          
          const deliverable = deliverables.find(d => d.id === entry.deliverableId);
          if (deliverable && deliverable.goalId) {
            goalTimeSpent[deliverable.goalId] = 
              (goalTimeSpent[deliverable.goalId] || 0) + hours;
          }
        }
      });
    });
    
    const goalsData = goals.map((goal, index) => {
      const goalDeliverables = deliverables.filter(d => d.goalId === goal.id);
      const activeDeliverables = goalDeliverables.filter(d => !d.completed);
      const completedDeliverables = goalDeliverables.filter(d => d.completed);
      const totalHours = goalTimeSpent[goal.id] || 0;
      
      return {
        'Sort Order': index + 1,
        'Goal Name': goal.name,
        'Impact Statement': goal.impact,
        'Status': goal.completed ? 'Completed' : 'Active',
        'Created Date': new Date(goal.createdAt).toLocaleDateString(),
        'Completed Date': goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : '',
        'Target Date': goal.targetDate || '',
        'Daily Target (hours)': goal.dailyTarget || '',
        'Total Hours Tracked': totalHours.toFixed(2),
        'Total Deliverables': goalDeliverables.length,
        'Active Deliverables': activeDeliverables.length,
        'Completed Deliverables': completedDeliverables.length,
        'Completion Rate': goalDeliverables.length > 0 ? 
          ((completedDeliverables.length / goalDeliverables.length) * 100).toFixed(1) + '%' : '0%'
      };
    });
    
    const deliverablesData = deliverables.map((deliverable, index) => {
      const goal = goals.find(g => g.id === deliverable.goalId);
      const totalHours = deliverableTimeSpent[deliverable.id] || 0;
      
      let entryCount = 0;
      Object.values(timeEntries).forEach(dayEntries => {
        entryCount += dayEntries.filter(e => e.deliverableId === deliverable.id).length;
      });
      
      return {
        'Sort Order': index + 1,
        'Deliverable Name': deliverable.name,
        'Associated Goal': goal ? goal.name : 'Unassigned',
        'Status': deliverable.completed ? 'Completed' : 'Active',
        'Created Date': new Date(deliverable.createdAt).toLocaleDateString(),
        'Completed Date': deliverable.completedAt ? new Date(deliverable.completedAt).toLocaleDateString() : '',
        'Total Hours Tracked': totalHours.toFixed(2),
        'Number of Time Entries': entryCount,
        'Average Session (hours)': entryCount > 0 ? (totalHours / entryCount).toFixed(2) : '0'
      };
    });
    
    const summaryStats = [{
      'Metric': 'Total Goals',
      'Count': goals.length,
      'Active': goals.filter(g => !g.completed).length,
      'Completed': goals.filter(g => g.completed).length
    }, {
      'Metric': 'Total Deliverables', 
      'Count': deliverables.length,
      'Active': deliverables.filter(d => !d.completed).length,
      'Completed': deliverables.filter(d => d.completed).length
    }, {
      'Metric': 'Unassigned Deliverables',
      'Count': deliverables.filter(d => !d.goalId).length,
      'Active': deliverables.filter(d => !d.goalId && !d.completed).length,
      'Completed': deliverables.filter(d => !d.goalId && d.completed).length
    }];
    
    const wb = XLSX.utils.book_new();
    
    if (goalsData.length > 0) {
      const goalsSheet = XLSX.utils.json_to_sheet(goalsData);
      XLSX.utils.book_append_sheet(wb, goalsSheet, 'Goals');
    }
    
    if (deliverablesData.length > 0) {
      const deliverablesSheet = XLSX.utils.json_to_sheet(deliverablesData);
      XLSX.utils.book_append_sheet(wb, deliverablesSheet, 'Deliverables');
    }
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryStats);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    
    const filename = `Goals_Deliverables_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    showSuccess('goalsSuccess');
  });
}

// ============================================
// DELIVERABLE MANAGEMENT FUNCTIONS
// ============================================

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

// Save deliverables sort order
function saveDeliverablesSortOrder() {
  chrome.storage.local.get(['deliverables'], (result) => {
    const deliverables = result.deliverables || [];
    const sortedDeliverables = [];
    
    document.querySelectorAll('.deliverables-list').forEach(list => {
      const listGoalId = list.dataset.goalId;
      const deliverableElements = list.querySelectorAll('.deliverable-item');
      
      deliverableElements.forEach(el => {
        const deliverableId = el.dataset.deliverableId;
        const deliverable = deliverables.find(d => d.id === deliverableId);
        if (deliverable) {
          deliverable.goalId = listGoalId;
          sortedDeliverables.push(deliverable);
        }
      });
    });
    
    const unassignedElements = document.querySelectorAll('#unassignedDeliverables .deliverable-item');
    unassignedElements.forEach(el => {
      const deliverableId = el.dataset.deliverableId;
      const deliverable = deliverables.find(d => d.id === deliverableId);
      if (deliverable) {
        deliverable.goalId = null;
        sortedDeliverables.push(deliverable);
      }
    });
    
    deliverables.forEach(deliverable => {
      if (!sortedDeliverables.find(d => d.id === deliverable.id)) {
        sortedDeliverables.push(deliverable);
      }
    });
    
    chrome.storage.local.set({ deliverables: sortedDeliverables }, () => {
      showSuccess('goalsSuccess');
    });
  });
}

// ============================================
// CATEGORY MANAGEMENT FUNCTIONS
// ============================================

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

// ============================================
// API KEY MANAGEMENT - FIXED WITH UnifiedAPIClient
// ============================================

// Setup API Key Management with correct class
function setupApiKeyManagement() {
  // Check if UnifiedAPIClient exists
  if (typeof UnifiedAPIClient === 'undefined') {
    console.log('API client not loaded yet');
    return;
  }
  
  const apiClient = new UnifiedAPIClient();
  
  // OpenAI Key Management
  const openaiKeyInput = document.getElementById('openaiApiKey');
  const saveOpenAIBtn = document.getElementById('saveOpenAIKey');
  const testOpenAIBtn = document.getElementById('testOpenAIKey');
  
  if (saveOpenAIBtn) {
    saveOpenAIBtn.addEventListener('click', async () => {
      const key = openaiKeyInput.value.trim();
      if (key) {
        await apiClient.saveApiKey('openai', key);
        showApiKeySuccess('OpenAI API key saved successfully!');
        openaiKeyInput.value = '';
        await loadApiKeyStatus();
      }
    });
  }
  
  if (testOpenAIBtn) {
    testOpenAIBtn.addEventListener('click', async () => {
      await testApiKey('openai');
    });
  }
  
  // Anthropic Key Management
  const anthropicKeyInput = document.getElementById('anthropicApiKey');
  const saveAnthropicBtn = document.getElementById('saveAnthropicKey');
  const testAnthropicBtn = document.getElementById('testAnthropicKey');
  
  if (saveAnthropicBtn) {
    saveAnthropicBtn.addEventListener('click', async () => {
      const key = anthropicKeyInput.value.trim();
      if (key) {
        await apiClient.saveApiKey('anthropic', key);
        showApiKeySuccess('Anthropic API key saved successfully!');
        anthropicKeyInput.value = '';
        await loadApiKeyStatus();
      }
    });
  }
  
  if (testAnthropicBtn) {
    testAnthropicBtn.addEventListener('click', async () => {
      await testApiKey('anthropic');
    });
  }
  
  // Google Key Management
  const googleKeyInput = document.getElementById('googleApiKey');
  const saveGoogleBtn = document.getElementById('saveGoogleKey');
  const testGoogleBtn = document.getElementById('testGoogleKey');
  
  if (saveGoogleBtn) {
    saveGoogleBtn.addEventListener('click', async () => {
      const key = googleKeyInput.value.trim();
      if (key) {
        await apiClient.saveApiKey('google', key);
        showApiKeySuccess('Google API key saved successfully!');
        googleKeyInput.value = '';
        await loadApiKeyStatus();
      }
    });
  }
  
  if (testGoogleBtn) {
    testGoogleBtn.addEventListener('click', async () => {
      await testApiKey('google');
    });
  }
  
  loadApiKeyStatus();
}

// Test API Key with actual API calls
async function testApiKey(provider) {
  if (typeof UnifiedAPIClient === 'undefined') {
    showApiKeyError('API client not loaded');
    return;
  }
  
  const apiClient = new UnifiedAPIClient();
  const testBtn = document.getElementById(`test${provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Google'}Key`);
  
  try {
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    const apiKey = await apiClient.getApiKey(provider);
    if (!apiKey) {
      throw new Error('No API key found. Please save a key first.');
    }
    
    // Use the testApiKey method from UnifiedAPIClient
    await apiClient.testApiKey(provider);
    showApiKeySuccess(`✅ ${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is working!`);
    
  } catch (error) {
    console.error(`API test error for ${provider}:`, error);
    showApiKeyError(`❌ ${provider.charAt(0).toUpperCase() + provider.slice(1)} test failed: ${error.message}`);
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test';
  }
}

// Load and display API key status
async function loadApiKeyStatus() {
  if (typeof UnifiedAPIClient === 'undefined') return;
  
  const apiClient = new UnifiedAPIClient();
  const providers = ['openai', 'anthropic', 'google'];
  
  for (const provider of providers) {
    const hasKey = await apiClient.getApiKey(provider);
    const statusElement = document.getElementById(`${provider}KeyStatus`);
    
    if (statusElement) {
      if (hasKey) {
        statusElement.innerHTML = '<span style="color: green;">✔ Configured</span>';
      } else {
        statusElement.innerHTML = '<span style="color: red;">✗ Not configured</span>';
      }
    }
  }
}

// Show API key success message
function showApiKeySuccess(message) {
  const successDiv = document.getElementById('apiKeySuccess');
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
      successDiv.style.display = 'none';
    }, 3000);
  }
}

// Show API key error message
function showApiKeyError(message) {
  const errorDiv = document.getElementById('apiKeyError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

// ============================================
// CUSTOM MODELS MANAGEMENT - FIXED VERSION
// ============================================

// Load and display custom models
async function loadCustomModels() {
  console.log('Loading custom models...');
  
  try {
    chrome.storage.local.get(['customModels'], (result) => {
      const customModels = result.customModels || {};
      
      console.log('Raw customModels from storage:', customModels);
      
      let totalModels = 0;
      const customModelsDiv = document.getElementById('customModelsList');
      
      if (!customModelsDiv) {
        console.error('customModelsList element not found');
        return;
      }
      
      customModelsDiv.innerHTML = '';
      
      if (typeof customModels === 'object' && !Array.isArray(customModels)) {
        Object.keys(customModels).forEach(provider => {
          const models = customModels[provider];
          
          if (Array.isArray(models) && models.length > 0) {
            const providerSection = document.createElement('div');
            providerSection.className = 'provider-section mb-3';
            providerSection.innerHTML = `<h6 class="text-muted">${provider.toUpperCase()} Models</h6>`;
            
            models.forEach(model => {
              totalModels++;
              const modelDiv = document.createElement('div');
              modelDiv.className = 'custom-model-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded';
              modelDiv.innerHTML = `
                <div>
                  <strong>${model.name}</strong> (${model.id})
                  <br>
                  <small>Max Tokens: ${model.maxTokens || 128000}</small>
                  ${model.default ? '<span class="badge badge-primary ml-2">Default</span>' : ''}
                </div>
                <div>
                  <button class="btn btn-sm btn-outline-primary edit-model" data-provider="${provider}" data-id="${model.id}">Edit</button>
                  <button class="btn btn-sm btn-outline-danger delete-model ml-1" data-provider="${provider}" data-id="${model.id}">Delete</button>
                </div>
              `;
              providerSection.appendChild(modelDiv);
            });
            
            customModelsDiv.appendChild(providerSection);
          }
        });
      }
      
      console.log(`Found custom models: ${totalModels}`);
      
      if (totalModels === 0) {
        customModelsDiv.innerHTML = '<p class="text-muted">No custom models configured</p>';
      }
      
      // Add event listeners for edit and delete buttons
      document.querySelectorAll('.edit-model').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const provider = e.target.dataset.provider;
          const modelId = e.target.dataset.id;
          const model = customModels[provider].find(m => m.id === modelId);
          if (model) {
            openCustomModelModal(model, provider);
          }
        });
      });
      
      document.querySelectorAll('.delete-model').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const provider = e.target.dataset.provider;
          const modelId = e.target.dataset.id;
          deleteCustomModel(provider, modelId);
        });
      });
    });
  } catch (error) {
    console.error('Error loading custom models:', error);
  }
}

// Delete custom model - Promise-based version
function deleteCustomModel(provider, modelId) {
  // Defer the blocking operation
  requestAnimationFrame(() => {
    if (!confirm('Are you sure you want to delete this model?')) {
      return;
    }
    
    chrome.storage.local.get(['customModels'], (result) => {
      const customModels = result.customModels || {};
      
      if (customModels[provider]) {
        customModels[provider] = customModels[provider].filter(m => m.id !== modelId);
        
        if (customModels[provider].length === 0) {
          delete customModels[provider];
        }
        
        chrome.storage.local.set({ customModels: customModels }, () => {
          console.log('Model deleted successfully');
          showApiKeySuccess('Model deleted successfully!');
          loadCustomModels();
        });
      }
    });
  });
}
// Open custom model modal
function openCustomModelModal(model = null, provider = 'openai') {
  const modal = document.getElementById('customModelModal');
  const title = document.querySelector('#customModelModal .modal-title');
  
  if (!modal) {
    console.error('Custom model modal not found');
    return;
  }
  
  if (title) {
    title.textContent = model ? 'Edit Custom Model' : 'Add Custom Model';
  }
  
  document.getElementById('customModelProvider').value = provider;
  document.getElementById('customModelId').value = model?.id || '';
  document.getElementById('customModelName').value = model?.name || '';
  document.getElementById('customModelMaxTokens').value = model?.maxTokens || 128000;
  document.getElementById('customModelDefault').checked = model?.default || false;
  
  modal.style.display = 'flex';
  editingModel = model; // Store the model being edited
  console.log('Opened custom model modal', model ? 'for editing' : 'for new model');
}

// Close custom model modal
function closeCustomModelModal() {
  const modal = document.getElementById('customModelModal');
  if (modal) {
    modal.style.display = 'none';
  }
  editingModel = null;
  console.log('Closed custom model modal');
}

// Save custom model
async function saveCustomModel() {
  const provider = document.getElementById('customModelProvider').value;
  const id = document.getElementById('customModelId').value.trim();
  const name = document.getElementById('customModelName').value.trim();
  const maxTokens = parseInt(document.getElementById('customModelMaxTokens').value) || 128000;
  const isDefault = document.getElementById('customModelDefault').checked;
  
  console.log('Saving custom model:', { provider, id, name, maxTokens, isDefault });
  
  if (!id || !name) {
    alert('Please fill in all required fields');
    return;
  }
  
  chrome.storage.local.get(['customModels'], (result) => {
    let customModels = result.customModels || {};
    
    if (Array.isArray(customModels) || customModels === null) {
      console.log('Converting customModels from array/null to object');
      customModels = {};
    }
    
    if (!customModels[provider]) {
      customModels[provider] = [];
    }
    
    if (!Array.isArray(customModels[provider])) {
      console.log('Converting provider models to array');
      customModels[provider] = [];
    }
    
    const models = customModels[provider];
    
    if (editingModel) {
      const index = models.findIndex(m => m.id === editingModel.id);
      if (index >= 0) {
        models[index] = { id, name, maxTokens, default: isDefault };
        console.log('Updated existing model at index', index);
      }
    } else {
      if (models.find(m => m.id === id)) {
        alert('A model with this ID already exists for this provider');
        return;
      }
      models.push({ id, name, maxTokens, default: isDefault });
      console.log('Added new model to array:', models);
    }
    
    if (isDefault) {
      models.forEach(m => {
        if (m.id !== id) {
          m.default = false;
        }
      });
    }
    
    customModels[provider] = models;
    
    console.log('About to save customModels:', JSON.stringify(customModels, null, 2));
    
    chrome.storage.local.set({ customModels: customModels }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving:', chrome.runtime.lastError);
        alert('Failed to save custom model: ' + chrome.runtime.lastError.message);
        return;
      }
      
      console.log('Custom models saved successfully');
      
      chrome.storage.local.get(['customModels'], (verifyResult) => {
        console.log('Verification - saved models:', JSON.stringify(verifyResult.customModels, null, 2));
      });
      
      showApiKeySuccess('Custom model saved successfully!');
      closeCustomModelModal();
      
      setTimeout(() => {
        loadCustomModels();
      }, 200);
      // No message sending needed - popup reads from storage directly
    });
  });
}

// Setup custom model modal
function setupCustomModelModal() {
  console.log('Setting up custom model modal event listeners');
  
  const modal = document.getElementById('customModelModal');
  const addBtn = document.getElementById('addCustomModelBtn');
  const closeBtn = document.getElementById('closeCustomModelModal');
  const cancelBtn = document.getElementById('cancelCustomModelBtn');
  const saveBtn = document.getElementById('saveCustomModelBtn');
  
  if (addBtn) {
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    newAddBtn.addEventListener('click', () => {
      console.log('Add button clicked');
      editingModel = null;
      openCustomModelModal();
    });
  }
  
  if (closeBtn) {
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener('click', closeCustomModelModal);
  }
  
  if (cancelBtn) {
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    newCancelBtn.addEventListener('click', closeCustomModelModal);
  }
  
  if (saveBtn) {
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', () => {
      console.log('Save button clicked');
      saveCustomModel();
    });
  }
  
  if (modal && !modal.hasAttribute('data-click-listener')) {
    modal.setAttribute('data-click-listener', 'true');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeCustomModelModal();
      }
    });
  }
}

// Debug function to check storage
function debugStorage() {
  chrome.storage.local.get(null, (items) => {
    console.log('All items in local storage:', items);
    if (items.customModels) {
      console.log('Custom models structure:', JSON.stringify(items.customModels, null, 2));
    }
  });
}

// Clear all custom models (for debugging)
function clearAllCustomModels() {
  if (confirm('This will delete ALL custom models. Are you sure?')) {
    chrome.storage.local.remove('customModels', () => {
      console.log('All custom models cleared');
      loadCustomModels();
    });
  }
}


// ============================================
// REPORT HISTORY MANAGEMENT - FIXED VERSION
// ============================================

// Load and display report history
function loadReportHistory() {
  chrome.storage.local.get(['aiReports'], (result) => {
    const reports = result.aiReports || [];
    const historyList = document.getElementById('reportHistoryList');
    
    if (!historyList) return;
    
    if (reports.length === 0) {
      historyList.innerHTML = '<p style="color: #666;">No saved reports yet. Generate a report to see it here.</p>';
      return;
    }
    
    const sortedReports = reports.sort((a, b) => 
      new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0)
    );
    
    historyList.innerHTML = sortedReports.slice(0, 20).map((report, index) => `
      <div class="report-history-item" style="padding: 15px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${report.title || report.template || 'AI Report'}</strong>
            <br>
            <small style="color: #6c757d;">
              ${new Date(report.createdAt || report.timestamp || Date.now()).toLocaleString()}
            </small>
            ${report.provider ? `<br><small style="color: #6c757d;">Provider: ${report.provider} | Model: ${report.model}</small>` : ''}
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="button secondary view-saved-report-btn" data-report-index="${index}" style="padding: 6px 12px;">
              👁️ View
            </button>
            <button class="button secondary copy-saved-report-btn" data-report-index="${index}" style="padding: 6px 12px;">
              📋 Copy
            </button>
            <button class="button danger delete-saved-report-btn" data-report-index="${index}" style="padding: 6px 12px; background: #dc3545; border-color: #dc3545;">
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
    // Add event listeners
    historyList.querySelectorAll('.view-saved-report-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.reportIndex);
        viewSavedReport(sortedReports[index]);
      });
    });
    
    historyList.querySelectorAll('.copy-saved-report-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.reportIndex);
        copySavedReport(sortedReports[index]);
      });
    });
    
    historyList.querySelectorAll('.delete-saved-report-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.reportIndex);
        if (confirm('Are you sure you want to delete this report?')) {
          deleteSavedReport(sortedReports[index].id || index);
        }
      });
    });
  });
}
// ============================================
// COMPLETE REPORT VIEWER FUNCTIONS FOR OPTIONS.JS
// Replace the existing functions with this comprehensive version
// ============================================

// View saved report with full UnifiedAIReports display capabilities
function viewSavedReport(report) {
  // If UnifiedAIReports is available, use its displayReport method for consistency
  if (window.aiReports && window.aiReports.displayReport) {
    // Use the UnifiedAIReports displayReport method which handles everything properly
    window.aiReports.displayReport(report);
    return;
  }
  
  // Fallback: Full implementation with all features from UnifiedAIReports
  const modal = document.getElementById('reportViewerModal');
  const content = document.getElementById('reportContent');
  
  if (!modal || !content) return;
  
  // Ensure modal has proper display properties
  modal.style.cssText = `
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
  
  // Extract the report HTML content from the report object
  let reportHTML = report.content || report.html || report.htmlContent || report.reportContent || '';
  
  // If report is a string, use it directly
  if (typeof report === 'string') {
    reportHTML = report;
  }
  
  // Convert markdown-style formatting to HTML if the content appears to be markdown
  if (reportHTML.includes('**') || reportHTML.includes('##')) {
    reportHTML = convertMarkdownToHTML(reportHTML);
  }
  
  // Extract and process chart containers from the report HTML
  const chartMatches = reportHTML.match(/<div class="chart-container"[^>]*>[\s\S]*?<\/div>/g) || [];
  
  // Replace chart divs with unique placeholders temporarily
  chartMatches.forEach((chartDiv, index) => {
    const placeholder = `<!--CHART_PLACEHOLDER_${index}-->`;
    reportHTML = reportHTML.replace(chartDiv, placeholder);
  });
  
  // Build the final HTML with proper chart containers
  let chartsHTML = '';
  if (report.chartData) {
    chartsHTML = '<div class="charts-section" style="margin: 20px 0; width: 100%;">';
    
    // Add chart containers for each chart type
    if (report.chartData.dailyHours) {
      chartsHTML += `
        <div class="chart-wrapper" style="margin: 30px 0; width: 100%;">
          <h3 style="text-align: center; margin-bottom: 15px;">Daily Time Distribution</h3>
          <div class="chart-container" style="height: 300px; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative;">
            <canvas id="dailyHoursChart" style="max-width: 100%; height: 280px;"></canvas>
          </div>
        </div>`;
    }
    
    if (report.chartData.categoryPie) {
      chartsHTML += `
        <div class="chart-wrapper" style="margin: 30px 0; width: 100%;">
          <h3 style="text-align: center; margin-bottom: 15px;">Time by Category</h3>
          <div class="chart-container" style="height: 300px; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative;">
            <canvas id="categoryPieChart" style="max-width: 100%; height: 280px;"></canvas>
          </div>
        </div>`;
    }
    
    if (report.chartData.hourlyDistribution) {
      chartsHTML += `
        <div class="chart-wrapper" style="margin: 30px 0; width: 100%;">
          <h3 style="text-align: center; margin-bottom: 15px;">Hourly Activity Pattern</h3>
          <div class="chart-container" style="height: 300px; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative;">
            <canvas id="hourlyDistributionChart" style="max-width: 100%; height: 280px;"></canvas>
          </div>
        </div>`;
    }
    
    if (report.chartData.focusBreakdown) {
      chartsHTML += `
        <div class="chart-wrapper" style="margin: 30px 0; width: 100%;">
          <h3 style="text-align: center; margin-bottom: 15px;">Focus Session Distribution</h3>
          <div class="chart-container" style="height: 300px; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative;">
            <canvas id="focusBreakdownChart" style="max-width: 100%; height: 280px;"></canvas>
          </div>
        </div>`;
    }
    
    chartsHTML += '</div>';
  }
  
  // Replace placeholders with empty strings (remove the inline chart containers)
  chartMatches.forEach((_, index) => {
    const placeholder = `<!--CHART_PLACEHOLDER_${index}-->`;
    reportHTML = reportHTML.replace(placeholder, '');
  });
  
  // Build final report HTML with flex-wrap for buttons
  const finalHTML = `
    <div style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
      <button class="button secondary" id="copyReportToEmail" style="white-space: nowrap;">📧 Copy for Email</button>
      <button class="button secondary" id="copyReportAsText" style="white-space: nowrap;">📋 Copy as Text</button>
      <button class="button secondary" id="copyReportAsHTML" style="white-space: nowrap;">📄 Copy as HTML</button>
    </div>
    <div id="reportContentBody" style="padding: 20px; background: #f9f9f9; border-radius: 8px; width: 100%; box-sizing: border-box;">
      <div class="report-text" style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; width: 100%; box-sizing: border-box;">
        ${reportHTML}
      </div>
      ${chartsHTML}
    </div>
  `;
  
  content.innerHTML = finalHTML;
  
  // Ensure modal content has proper width
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.style.maxWidth = '900px';
    modalContent.style.width = '95%';
  }
  
  // Store current report for copy functions
  window.currentViewedReport = report;
  
  // Add event listeners for buttons with delay to ensure DOM is ready
  setTimeout(() => {
    document.getElementById('copyReportToEmail')?.addEventListener('click', () => copyReportForEmail(report));
    document.getElementById('copyReportAsText')?.addEventListener('click', () => copyReportAsText(report));
    document.getElementById('copyReportAsHTML')?.addEventListener('click', () => copyReportAsHTML(report));
    
    // Render charts if data exists - add extra delay for canvas elements
    if (report.chartData) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          renderChartsFromData(report.chartData);
        }, 150);
      });
    }
  }, 100);
}

// Render charts from chart data (comprehensive version from UnifiedAIReports)
function renderChartsFromData(chartData) {
  // Check if Chart.js is available
  const ChartJS = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);
  if (!ChartJS) {
    console.error('Chart.js is not loaded. Please ensure chart.min.js is included.');
    return;
  }
  
  // Helper function to render chart with retries
  const renderChart = (canvasId, config, retries = 3) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      if (retries > 0) {
        setTimeout(() => renderChart(canvasId, config, retries - 1), 100);
      }
      return;
    }
    
    try {
      // Clear any existing chart
      if (canvas.chart) {
        canvas.chart.destroy();
        canvas.chart = null;
      }
      
      // Get context
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error(`Could not get context for ${canvasId}`);
        return;
      }
      
      // Add responsive options
      const enhancedConfig = {
        ...config,
        options: {
          ...config.options,
          responsive: true,
          maintainAspectRatio: false
        }
      };
      
      canvas.chart = new ChartJS(ctx, enhancedConfig);
    } catch (error) {
      console.error(`Error rendering chart ${canvasId}:`, error);
      if (retries > 0) {
        setTimeout(() => renderChart(canvasId, config, retries - 1), 100);
      }
    }
  };
  
  // Render each chart type
  if (chartData.dailyHours) {
    renderChart('dailyHoursChart', chartData.dailyHours);
  }
  
  if (chartData.categoryPie) {
    renderChart('categoryPieChart', chartData.categoryPie);
  }
  
  if (chartData.hourlyDistribution) {
    renderChart('hourlyDistributionChart', chartData.hourlyDistribution);
  }
  
  if (chartData.focusBreakdown) {
    renderChart('focusBreakdownChart', chartData.focusBreakdown);
  }
}

// Convert comprehensive markdown to HTML (from UnifiedAIReports)
function convertMarkdownToHTML(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Preserve code blocks first (to avoid processing their content)
  const codeBlocks = [];
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  
  // Preserve inline code
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `__INLINE_CODE_${inlineCodes.length - 1}__`;
  });
  
  // Convert tables (must be before other conversions)
  html = convertMarkdownTables(html);
  
  // Convert headers (h1-h6)
  html = html.replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');
  html = html.replace(/^___$/gm, '<hr>');

// Convert blockquotes
// Normalize custom BLOCKQUOTE markers and plain markdown "> " to <blockquote>…</blockquote>
html = html
  .replace(/BLOCKQUOTE(?!\d)/g, '<blockquote>')   // opening marker
  .replace(/BLOCKQUOTE\d+/g, '</blockquote>')     // closing marker(s)
  .replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>'); // markdown style

// Merge consecutive blockquotes
html = html.replace(/<\/blockquote>\s*<blockquote>/g, '\n');

  
  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Convert images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  
  // Convert bold and italic
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Convert strikethrough
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  
  // Convert lists
  html = convertMarkdownLists(html);
  
  // Restore code blocks and inline codes
  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block);
  });
  
  inlineCodes.forEach((code, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, code);
  });
  
  // Convert paragraphs
  const lines = html.split('\n');
  const processedLines = [];
  let inList = false;
  let inTable = false;
  let inBlockquote = false;
  let inCodeBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Track context
    if (trimmedLine.includes('<ul>') || trimmedLine.includes('<ol>')) inList = true;
    if (trimmedLine.includes('</ul>') || trimmedLine.includes('</ol>')) inList = false;
    if (trimmedLine.includes('<table>')) inTable = true;
    if (trimmedLine.includes('</table>')) inTable = false;
    if (trimmedLine.includes('<blockquote>')) inBlockquote = true;
    if (trimmedLine.includes('</blockquote>')) inBlockquote = false;
    if (trimmedLine.includes('<pre>')) inCodeBlock = true;
    if (trimmedLine.includes('</pre>')) inCodeBlock = false;
    
    // Add line as-is if it's HTML or empty
    if (!trimmedLine || 
        inList || 
        inTable || 
        inBlockquote || 
        inCodeBlock ||
        trimmedLine.startsWith('<') || 
        trimmedLine.includes('<h') || 
        trimmedLine.includes('<hr')) {
      processedLines.push(line);
    } else {
      // Wrap in paragraph
      processedLines.push(`<p>${line}</p>`);
    }
  }
  
  html = processedLines.join('\n');
  
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  
  return html;
}

// Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Convert markdown tables to HTML
function convertMarkdownTables(text) {
  const lines = text.split('\n');
  const result = [];
  let i = 0;
  
  while (i < lines.length) {
    // Check if this might be a table
    if (i < lines.length - 1 && 
        lines[i].includes('|') && 
        lines[i + 1].includes('|') && 
        lines[i + 1].match(/^[\s\-:|]+$/)) {
      
      // Found a potential table
      const tableLines = [];
      const startIndex = i;
      
      // Collect all table lines
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      
      if (tableLines.length >= 2) {
        // Parse the table
        const table = parseMarkdownTable(tableLines);
        result.push(table);
      } else {
        // Not a valid table, add lines as-is
        for (let j = startIndex; j < i; j++) {
          result.push(lines[j]);
        }
      }
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  
  return result.join('\n');
}

// Parse a markdown table
function parseMarkdownTable(lines) {
  // Extract headers
  const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
  
  // Extract alignment from separator line
  const alignments = lines[1].split('|').map(sep => {
    sep = sep.trim();
    if (sep.startsWith(':') && sep.endsWith(':')) return 'center';
    if (sep.endsWith(':')) return 'right';
    if (sep.startsWith(':')) return 'left';
    return 'left';
  }).filter((_, index) => headers[index] !== undefined);
  
  // Build HTML table
  let html = '<table class="markdown-table" style="border-collapse: collapse; width: 100%; margin: 1em 0;">\n';
  
  // Add header
  html += '<thead>\n<tr>\n';
  headers.forEach((header, index) => {
    const align = alignments[index] || 'left';
    html += `<th style="border: 1px solid #ddd; padding: 8px; text-align: ${align}; background-color: #f2f2f2;">${header}</th>\n`;
  });
  html += '</tr>\n</thead>\n';
  
  // Add body
  html += '<tbody>\n';
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].includes('|')) continue;
    
    const cells = lines[i].split('|').map(c => c.trim()).filter((c, index) => index > 0 && index <= headers.length);
    
    if (cells.length > 0) {
      html += '<tr>\n';
      cells.forEach((cell, index) => {
        const align = alignments[index] || 'left';
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: ${align};">${cell}</td>\n`;
      });
      html += '</tr>\n';
    }
  }
  html += '</tbody>\n</table>';
  
  return html;
}

// Convert markdown lists
function convertMarkdownLists(text) {
  const lines = text.split('\n');
  const result = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check for unordered list
    if (line.match(/^[\s]*[\*\-\+] .+$/)) {
      const listItems = [];
      const listType = 'ul';
      
      // Collect all list items at this level
      while (i < lines.length && lines[i].match(/^[\s]*[\*\-\+] .+$/)) {
        const content = lines[i].replace(/^[\s]*[\*\-\+] /, '');
        listItems.push(content);
        i++;
      }
      
      // Build list HTML
      result.push(buildList(listItems, listType));
    }
    // Check for ordered list
    else if (line.match(/^[\s]*\d+\. .+$/)) {
      const listItems = [];
      const listType = 'ol';
      
      // Collect all list items
      while (i < lines.length && lines[i].match(/^[\s]*\d+\. .+$/)) {
        const content = lines[i].replace(/^[\s]*\d+\. /, '');
        listItems.push(content);
        i++;
      }
      
      // Build list HTML
      result.push(buildList(listItems, listType));
    }
    else {
      result.push(line);
      i++;
    }
  }
  
  return result.join('\n');
}

// Build list HTML
function buildList(items, listType) {
  if (items.length === 0) return '';
  
  const tag = listType === 'ol' ? 'ol' : 'ul';
  let html = `<${tag}>`;
  
  items.forEach(item => {
    html += `<li>${item}</li>`;
  });
  
  html += `</${tag}>`;
  return html;
}

// Copy saved report to clipboard (simple text version)
async function copySavedReport(report) {
  try {
    const textContent = report.content || report.html || report.htmlContent || 'No content available';
    // Strip HTML if present
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = textContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || textContent;
    
    await navigator.clipboard.writeText(plainText);
    showSuccess('aiSettingsSuccess', '✅ Report copied to clipboard!');
  } catch (error) {
    console.error('Error copying report:', error);
    alert('Failed to copy report. Please try viewing it and copying manually.');
  }
}

// ============================================
// REPORT COPY FUNCTIONS - FIXED TO USE UNIFIED SYSTEM
// ============================================

// Copy report for email
async function copyReportForEmail(report) {
  // Use UnifiedAIReports instance if available
  if (window.aiReports && window.aiReports.currentReport) {
    window.aiReports.currentReport = report;
    await window.aiReports.copyReportForEmail();
    return;
  }
  
  // Fallback implementation with proper notification
  try {
    const reportBody = document.getElementById('reportContentBody');
    if (!reportBody) return;
    
    // Convert charts to images first
    await convertChartsToImages(reportBody);
    
    // Create email-friendly HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reportBody.innerHTML;
    document.body.appendChild(tempDiv);
    
    // Remove scripts and styles for email
    tempDiv.querySelectorAll('script').forEach(el => el.remove());
    tempDiv.querySelectorAll('style').forEach(el => el.remove());
    
    // Select and copy
    const range = document.createRange();
    range.selectNodeContents(tempDiv);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    document.execCommand('copy');
    selection.removeAllRanges();
    document.body.removeChild(tempDiv);
    
    // Use proper notification
    showNotificationPopup('✅ Report copied for email!', 'success');
  } catch (error) {
    console.error('Error copying report:', error);
    showNotificationPopup('❌ Failed to copy report for email', 'error');
  }
}

// Copy report as plain text
async function copyReportAsText(report) {
  // Use UnifiedAIReports instance if available
  if (window.aiReports && window.aiReports.currentReport) {
    window.aiReports.currentReport = report;
    await window.aiReports.copyReportAsText();
    return;
  }
  
  // Fallback implementation
  try {
    const reportBody = document.getElementById('reportContentBody');
    if (!reportBody) return;
    
    const plainText = reportBody.innerText || reportBody.textContent || '';
    await navigator.clipboard.writeText(plainText);
    
    showNotificationPopup('✅ Report copied as text!', 'success');
  } catch (error) {
    console.error('Error copying report:', error);
    showNotificationPopup('❌ Failed to copy report as text', 'error');
  }
}

// Copy report as HTML
async function copyReportAsHTML(report) {
  // Use UnifiedAIReports instance if available
  if (window.aiReports && window.aiReports.currentReport) {
    window.aiReports.currentReport = report;
    await window.aiReports.copyReportAsHTML();
    return;
  }
  
  // Fallback implementation
  try {
    const reportBody = document.getElementById('reportContentBody');
    if (!reportBody) return;
    
    // Convert charts to images first
    await convertChartsToImages(reportBody);
    
    const htmlContent = reportBody.innerHTML;
    
    // Try to copy as HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({ 'text/html': blob });
    
    await navigator.clipboard.write([clipboardItem]);
    showNotificationPopup('✅ Report copied as HTML!', 'success');
  } catch (error) {
    // Fallback to text copy
    console.error('HTML copy not supported, falling back to text:', error);
    await copyReportAsText(report);
  }
}

// Helper function to show notifications properly
function showNotificationPopup(message, type = 'info') {
  // If UnifiedAIReports is available, use its notification system
  if (window.aiReports && window.aiReports.showNotification) {
    window.aiReports.showNotification(message, type);
    return;
  }
  
  // Otherwise create our own notification
  let notification = document.getElementById('optionsReportNotification');
  
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'optionsReportNotification';
    document.body.appendChild(notification);
  }
  
  const styles = {
    success: 'background: linear-gradient(135deg, #10893e, #14cc60); color: white;',
    error: 'background: linear-gradient(135deg, #d83b01, #e74c0e); color: white;',
    warning: 'background: linear-gradient(135deg, #ffc107, #ff9800); color: #333;',
    info: 'background: linear-gradient(135deg, #0078d4, #106ebe); color: white;'
  };
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    z-index: 20001;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    min-width: 250px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
    ${styles[type] || styles.info}
  `;
  
  notification.textContent = message;
  notification.style.display = 'block';
  notification.style.opacity = '0';
  
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 300);
  }, 3000);
}

// Helper function to convert canvas charts to images
async function convertChartsToImages(container) {
  const canvases = container.querySelectorAll('canvas');
  
  for (const canvas of canvases) {
    try {
      // Create an image from the canvas
      const dataUrl = canvas.toDataURL('image/png');
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.cssText = canvas.style.cssText;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      
      // Replace canvas with image
      canvas.parentNode.replaceChild(img, canvas);
    } catch (error) {
      console.error('Error converting canvas to image:', error);
    }
  }
}

// Delete saved report
function deleteSavedReport(reportId) {
  chrome.storage.local.get(['aiReports'], (result) => {
    let reports = result.aiReports || [];
    
    if (typeof reportId === 'number') {
      reports.splice(reportId, 1);
    } else {
      reports = reports.filter(r => r.id !== reportId);
    }
    
    chrome.storage.local.set({ aiReports: reports }, () => {
      loadReportHistory();
      showSuccess('aiSettingsSuccess', 'Report deleted successfully!');
    });
  });
}

// Close report viewer modal
function closeReportViewer() {
  const modal = document.getElementById('reportViewerModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// ============================================
// SETTINGS SAVE FUNCTIONS
// ============================================

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
    
    if (autoTrackMeetings) {
      chrome.runtime.sendMessage({ action: 'restartAutoTracking' });
    }
  });
}

// Save AI settings
function saveAiSettings() {
  const settings = {
    defaultReportType: document.getElementById('defaultReportType').value,
    defaultDateRange: document.getElementById('aiDefaultDateRange').value,
    includeMultitasking: document.getElementById('aiDefaultMultitasking').checked,
    includeDeliverables: document.getElementById('aiDefaultDeliverables').checked,
    includeMeetings: document.getElementById('aiDefaultMeetings').checked,
    includeCategories: document.getElementById('aiDefaultCategories').checked,
    includePatterns: document.getElementById('aiDefaultPatterns').checked,
    includeProductivity: document.getElementById('aiDefaultProductivity').checked
  };
  
  chrome.storage.local.set({ aiReportSettings: settings }, () => {
    showSuccess('aiSettingsSuccess');
  });
}

// ============================================
// DATA MANAGEMENT FUNCTIONS
// ============================================

// Export all data to Excel
function exportAllData() {
  chrome.storage.local.get(['timeEntries', 'deliverables', 'goals'], (result) => {
    const timeEntries = result.timeEntries || {};
    const deliverables = result.deliverables || [];
    const goals = result.goals || [];
    
    if (Object.keys(timeEntries).length === 0) {
      alert('No data to export');
      return;
    }
    
    const allEntries = [];
    const deliverableAnalysis = [];
    const goalAnalysis = [];
    const multiTaskingAnalysis = [];
    
    const deliverableTotals = {};
    const goalTotals = {};
    
    Object.keys(timeEntries).forEach(date => {
      const entries = timeEntries[date];
      
      let totalMultitaskingTime = 0;
      let meetingMultitaskingTime = 0;
      
      entries.forEach(entry => {
        const hours = entry.duration / 3600000;
        
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
    
    const wb = XLSX.utils.book_new();
    
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
    
    const filename = `TimeTracker_AllData_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    showSuccess('dataSuccess');
  });
}

// Create backup
function createBackup() {
  chrome.storage.local.get(null, (data) => {
    const backup = {
      version: '3.0.0',
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
  e.target.value = '';
}

// Clear all data
function clearAllData() {
  if (!confirm('This will permanently delete ALL your time tracking data. Are you sure?')) return;
  if (!confirm('This action cannot be undone. Please confirm again.')) return;
  
  chrome.storage.local.clear(() => {
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

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Show success message
function showSuccess(elementId, message = 'Settings saved successfully!') {
  const element = document.getElementById(elementId);
  if (element) {
    if (message) {
      element.textContent = message;
    }
    element.classList.add('show');
    element.style.display = 'block';
    setTimeout(() => {
      element.classList.remove('show');
      element.style.display = 'none';
    }, 3000);
  }
}

// Get element after drag position
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.category-item:not(.dragging), .goal-item:not(.dragging)')];
  
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

// Get element after drag position for deliverables
function getDragAfterDeliverableElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.deliverable-item:not(.dragging)')];
  
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

// ============================================
// LOAD/DISPLAY FUNCTIONS
// ============================================

// Load statistics
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

// Load account status
function loadAccountStatus() {
  // Google Calendar status
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
  
  // Outlook status
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
  
  // Show redirect URI
  try {
    const redirectUri = chrome.identity.getRedirectURL();
    const redirectUriElement = document.getElementById('redirectUri');
    if (redirectUriElement) {
      redirectUriElement.textContent = redirectUri;
    }
  } catch (error) {
    console.log('Could not set redirect URI:', error);
  }
}

// Load and display goals - COMPLETE FUNCTION
function loadGoals() {
  chrome.storage.local.get(['goals', 'deliverables', 'timeEntries'], (result) => {
    const goals = result.goals || [];
    const deliverables = result.deliverables || [];
    const timeEntries = result.timeEntries || {};
    
    const showCompletedDeliverables = document.getElementById('showCompletedDeliverables').checked;
    
    const activeGoals = goals.filter(g => !g.completed);
    const completedGoals = goals.filter(g => g.completed);
    
    const goalTimeSpent = {};
    const deliverableTimeSpent = {};
    
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
    
    todayEntries.forEach(entry => {
      if (entry.deliverableId) {
        const deliverable = deliverables.find(d => d.id === entry.deliverableId);
        if (deliverable && deliverable.goalId) {
          todayGoalTime[deliverable.goalId] = 
            (todayGoalTime[deliverable.goalId] || 0) + entry.duration;
        }
      }
    });
    
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
          <div class="goal-item" data-goal-id="${goal.id}" draggable="true">
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
    
    const completedGoalsSection = document.getElementById('completedGoalsSection');
    const showCompletedGoals = document.getElementById('showCompletedGoals').checked;
    
    if (completedGoals.length > 0) {
      completedGoalsSection.style.display = showCompletedGoals ? 'block' : 'none';
    } else {
      completedGoalsSection.style.display = 'none';
    }
    
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
    
    setupGoalEventListeners();
    setupDragAndDropGoals();
    setupDragAndDropDeliverables();
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

// Load AI settings
function loadAiSettings() {
  chrome.storage.local.get(['aiReportSettings'], (result) => {
    const settings = result.aiReportSettings || {
      defaultReportType: 'productivity',
      defaultDateRange: 'week',
      includeMultitasking: true,
      includeDeliverables: true,
      includeMeetings: true,
      includeCategories: true,
      includePatterns: true,
      includeProductivity: true
    };
    
    document.getElementById('defaultReportType').value = settings.defaultReportType;
    document.getElementById('aiDefaultDateRange').value = settings.defaultDateRange;
    document.getElementById('aiDefaultMultitasking').checked = settings.includeMultitasking;
    document.getElementById('aiDefaultDeliverables').checked = settings.includeDeliverables;
    document.getElementById('aiDefaultMeetings').checked = settings.includeMeetings;
    document.getElementById('aiDefaultCategories').checked = settings.includeCategories;
    document.getElementById('aiDefaultPatterns').checked = settings.includePatterns;
    document.getElementById('aiDefaultProductivity').checked = settings.includeProductivity;
  });
}

// Load custom templates
function loadCustomTemplates() {
  chrome.storage.local.get(['customTemplates'], (result) => {
    const templates = result.customTemplates || {};
    const container = document.getElementById('customTemplatesList');
    
    if (Object.keys(templates).length === 0) {
      container.innerHTML = '<p style="color: #605e5c; text-align: center;">No custom templates yet. Create your first one!</p>';
      return;
    }
    
    container.innerHTML = Object.entries(templates).map(([name, template]) => `
      <div class="template-item" style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h4 style="margin: 0; color: #323130;">${name}</h4>
          <div>
            <button class="button secondary edit-template-btn" data-name="${name}" style="font-size: 12px; padding: 4px 10px;">Edit</button>
            <button class="button danger delete-template-btn" data-name="${name}" style="font-size: 12px; padding: 4px 10px;">Delete</button>
          </div>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #605e5c;">
          <div style="margin-bottom: 5px;"><strong>System:</strong> ${template.system.substring(0, 100)}...</div>
          <div><strong>User:</strong> ${template.user.substring(0, 100)}...</div>
        </div>
      </div>
    `).join('');
    
    container.querySelectorAll('.edit-template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => editTemplate(e.target.dataset.name));
    });
    
    container.querySelectorAll('.delete-template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => deleteTemplate(e.target.dataset.name));
    });
  });
}

// Edit template
function editTemplate(name) {
  chrome.storage.local.get(['customTemplates'], (result) => {
    const templates = result.customTemplates || {};
    const template = templates[name];
    
    if (template) {
      // Store the original name for editing
      editingTemplateName = name;
      
      document.getElementById('templateModalTitle').textContent = 'Edit Template';
      document.getElementById('templateName').value = name;
      document.getElementById('templateSystemPrompt').value = template.system;
      document.getElementById('templateUserPrompt').value = template.user;
      document.getElementById('templateEditorModal').classList.add('active');
    }
  });
}
// Delete template
function deleteTemplate(name) {
  if (!confirm(`Delete template "${name}"?`)) return;
  
  chrome.storage.local.get(['customTemplates'], (result) => {
    const templates = result.customTemplates || {};
    delete templates[name];
    
    chrome.storage.local.set({ customTemplates: templates }, () => {
      loadCustomTemplates();
      showSuccess('aiSettingsSuccess');
    });
  });
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================

// Setup tab navigation
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      const activeContent = document.getElementById(`${targetTab}Tab`);
      if (activeContent) {
        activeContent.classList.add('active');
      }
    });
  });
}

// Setup goal event listeners - COMPLETE FUNCTION
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

// Setup drag and drop for goals - COMPLETE FUNCTION
function setupDragAndDropGoals() {
  const goalItems = document.querySelectorAll('#goalsList .goal-item[draggable="true"]');
  let draggedGoal = null;
  
  goalItems.forEach(item => {
    item.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || 
          e.target.classList.contains('deliverable-item')) {
        item.draggable = false;
      } else {
        item.draggable = true;
      }
    });
    
    item.addEventListener('dragstart', (e) => {
      draggedGoal = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    
    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
      draggedGoal = null;
      item.draggable = true;
      saveGoalsSortOrder();
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(document.getElementById('goalsList'), e.clientY);
      const goalsList = document.getElementById('goalsList');
      
      if (draggedGoal && draggedGoal !== item) {
        if (afterElement == null) {
          goalsList.appendChild(draggedGoal);
        } else {
          goalsList.insertBefore(draggedGoal, afterElement);
        }
      }
    });
  });
}

// Setup drag and drop for deliverables - COMPLETE FUNCTION
function setupDragAndDropDeliverables() {
  const deliverableItems = document.querySelectorAll('.deliverable-item[draggable="true"]');
  const deliverableLists = document.querySelectorAll('.deliverables-list');
  const unassignedArea = document.getElementById('unassignedDeliverables');
  let draggedDeliverable = null;
  
  deliverableItems.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedDeliverable = {
        id: item.dataset.deliverableId,
        element: item
      };
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    
    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
      if (draggedDeliverable) {
        saveDeliverablesSortOrder();
      }
      draggedDeliverable = null;
    });
  });
  
  deliverableLists.forEach(list => {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      list.style.background = '#e3f2fd';
      
      if (draggedDeliverable) {
        const afterElement = getDragAfterDeliverableElement(list, e.clientY);
        if (afterElement == null) {
          list.appendChild(draggedDeliverable.element);
        } else {
          list.insertBefore(draggedDeliverable.element, afterElement);
        }
      }
    });
    
    list.addEventListener('dragleave', (e) => {
      list.style.background = '';
    });
    
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      list.style.background = '';
    });
  });
  
  if (unassignedArea) {
    unassignedArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      unassignedArea.style.background = '#f8f9fa';
      
      if (draggedDeliverable) {
        const afterElement = getDragAfterDeliverableElement(unassignedArea, e.clientY);
        if (afterElement == null) {
          unassignedArea.appendChild(draggedDeliverable.element);
        } else {
          unassignedArea.insertBefore(draggedDeliverable.element, afterElement);
        }
      }
    });
    
    unassignedArea.addEventListener('dragleave', (e) => {
      unassignedArea.style.background = '';
    });
    
    unassignedArea.addEventListener('drop', (e) => {
      e.preventDefault();
      unassignedArea.style.background = '';
    });
  }
}

// Setup drag and drop for categories - COMPLETE FUNCTION
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
  
  document.querySelectorAll('.delete-category').forEach(btn => {
    btn.addEventListener('click', function() {
      const category = this.dataset.category;
      if (confirm(`Delete category "${category}"?`)) {
        deleteCategory(category);
      }
    });
  });
}

// Setup social sharing buttons - COMPLETE FUNCTION
function setupSocialSharingButtons() {
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
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
  }

  const shareLinkedIn = document.getElementById('shareLinkedIn');
  if (shareLinkedIn) {
    shareLinkedIn.addEventListener('click', () => {
      const url = 'https://github.com/Maniwar/time_tracker';
      const text = `Just discovered Universal Time Tracker - a free Chrome extension that helped me prove we needed more headcount with actual data! 

It tracks multi-tasking during meetings (we all do it), auto-syncs with calendars, and exports reports that managers understand.

No premium tiers, no locked features - completely free forever.`;
      
      const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
      window.open(linkedInUrl, '_blank', 'width=600,height=600');
    });
  }

  const shareTwitter = document.getElementById('shareTwitter');
  if (shareTwitter) {
    shareTwitter.addEventListener('click', () => {
      const text = `Found a time tracker that actually admits we multitask during meetings 😅

Universal Time Tracker helped me prove we needed 2 more devs - and we got them!

Free forever, no BS: `;
      const url = 'https://github.com/Maniwar/time_tracker';
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=productivity,timetracking,developertools`;
      window.open(twitterUrl, '_blank', 'width=600,height=400');
    });
  }

  const shareReddit = document.getElementById('shareReddit');
  if (shareReddit) {
    shareReddit.addEventListener('click', () => {
      const url = 'https://github.com/Maniwar/time_tracker';
      const title = 'Universal Time Tracker - Free Chrome extension that helped me get headcount approved';
      const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
      window.open(redditUrl, '_blank', 'width=900,height=600');
    });
  }

  const shareFacebook = document.getElementById('shareFacebook');
  if (shareFacebook) {
    shareFacebook.addEventListener('click', () => {
      const url = 'https://github.com/Maniwar/time_tracker';
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      window.open(facebookUrl, '_blank', 'width=600,height=400');
    });
  }

  const shareEmail = document.getElementById('shareEmail');
  if (shareEmail) {
    shareEmail.addEventListener('click', () => {
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
  }

  const shareSuccess = document.getElementById('shareSuccess');
  if (shareSuccess) {
    shareSuccess.addEventListener('click', () => {
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
      
      chrome.storage.local.get(['successStories'], (result) => {
        const count = (result.successStories || 0) + 1;
        chrome.storage.local.set({ successStories: count });
      });
    });
  }
}

// Setup main event listeners
function setupEventListeners() {
  // Client ID
  const saveClientIdBtn = document.getElementById('saveClientIdBtn');
  if (saveClientIdBtn) {
    saveClientIdBtn.addEventListener('click', saveClientId);
  }
  
  // Goals
  const addGoalBtn = document.getElementById('addGoalBtn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', addGoal);
  }
  
  const exportGoalsBtn = document.getElementById('exportGoalsDeliverables');
  if (exportGoalsBtn) {
    exportGoalsBtn.addEventListener('click', exportGoalsAndDeliverables);
  }
  
  const saveGoalBtn = document.getElementById('saveGoalBtn');
  if (saveGoalBtn) {
    saveGoalBtn.addEventListener('click', saveGoal);
  }
  
  const cancelGoalBtn = document.getElementById('cancelGoalBtn');
  if (cancelGoalBtn) {
    cancelGoalBtn.addEventListener('click', () => {
      document.getElementById('goalModal').classList.remove('active');
    });
  }
  
  const closeGoalModal = document.getElementById('closeGoalModal');
  if (closeGoalModal) {
    closeGoalModal.addEventListener('click', () => {
      document.getElementById('goalModal').classList.remove('active');
    });
  }
  
  // Show/hide completed
  const showCompletedGoalsCheckbox = document.getElementById('showCompletedGoals');
  const completedGoalsSection = document.getElementById('completedGoalsSection');
  
  if (showCompletedGoalsCheckbox && completedGoalsSection) {
    completedGoalsSection.style.display = showCompletedGoalsCheckbox.checked ? 'block' : 'none';
    
    showCompletedGoalsCheckbox.addEventListener('change', (e) => {
      completedGoalsSection.style.display = e.target.checked ? 'block' : 'none';
    });
  }
  
  const showCompletedDeliverables = document.getElementById('showCompletedDeliverables');
  if (showCompletedDeliverables) {
    showCompletedDeliverables.addEventListener('change', () => {
      loadGoals();
    });
  }
  
  // Categories
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', addCategory);
  }
  
  const newCategoryInput = document.getElementById('newCategoryInput');
  if (newCategoryInput) {
    newCategoryInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') addCategory();
    });
  }
  
  // Quick actions
  const saveQuickActionsBtn = document.getElementById('saveQuickActionsBtn');
  if (saveQuickActionsBtn) {
    saveQuickActionsBtn.addEventListener('click', saveQuickActions);
  }
  
  // Export settings
  const saveExportSettingsBtn = document.getElementById('saveExportSettingsBtn');
  if (saveExportSettingsBtn) {
    saveExportSettingsBtn.addEventListener('click', saveExportSettings);
  }
  
  // Multi-tasking settings
  const saveMultitaskingBtn = document.getElementById('saveMultitaskingBtn');
  if (saveMultitaskingBtn) {
    saveMultitaskingBtn.addEventListener('click', saveMultitaskingSettings);
  }
  
  // Auto-tracking settings
  const saveAutoTrackingBtn = document.getElementById('saveAutoTrackingBtn');
  if (saveAutoTrackingBtn) {
    saveAutoTrackingBtn.addEventListener('click', saveAutoTrackingSettings);
  }
  
  // AI settings
  const saveAiSettingsBtn = document.getElementById('saveAiSettingsBtn');
  if (saveAiSettingsBtn) {
    saveAiSettingsBtn.addEventListener('click', saveAiSettings);
  }
  
  const addCustomTemplateBtn = document.getElementById('addCustomTemplateBtn');
  if (addCustomTemplateBtn) {
    addCustomTemplateBtn.addEventListener('click', () => {
      // Reset editing state when adding new template
      editingTemplateName = null;
      
      document.getElementById('templateModalTitle').textContent = 'Add Custom Template';
      document.getElementById('templateName').value = '';
      document.getElementById('templateSystemPrompt').value = '';
      document.getElementById('templateUserPrompt').value = '';
      document.getElementById('templateEditorModal').classList.add('active');
    });
  }
  
  const closeTemplateModal = document.getElementById('closeTemplateModal');
  if (closeTemplateModal) {
    closeTemplateModal.addEventListener('click', () => {
      document.getElementById('templateEditorModal').classList.remove('active');
    });
  }
  
  const cancelTemplateBtn = document.getElementById('cancelTemplateBtn');
  if (cancelTemplateBtn) {
    cancelTemplateBtn.addEventListener('click', () => {
      document.getElementById('templateEditorModal').classList.remove('active');
    });
  }
  
  const saveTemplateBtn = document.getElementById('saveTemplateBtn');
  if (saveTemplateBtn) {
    saveTemplateBtn.addEventListener('click', () => {
      const name = document.getElementById('templateName').value.trim();
      const system = document.getElementById('templateSystemPrompt').value.trim();
      const user = document.getElementById('templateUserPrompt').value.trim();
      
      if (!name || !system || !user) {
        alert('Please fill in all fields');
        return;
      }
      
      chrome.storage.local.get(['customTemplates'], (result) => {
        const templates = result.customTemplates || {};
        
        // If editing and the name changed, delete the old template
        if (editingTemplateName && editingTemplateName !== name) {
          delete templates[editingTemplateName];
        }
        
        // Save the template (either new or updated)
        templates[name] = { system, user };
        
        chrome.storage.local.set({ customTemplates: templates }, () => {
          document.getElementById('templateEditorModal').classList.remove('active');
          loadCustomTemplates();
          showSuccess('aiSettingsSuccess');
          
          // Reset editing state
          editingTemplateName = null;
        });
      });
    });
  }
  

  // Report history
  const refreshReportBtn = document.getElementById('refreshReportHistory');
  if (refreshReportBtn) {
    refreshReportBtn.addEventListener('click', () => {
      loadReportHistory();
      showSuccess('aiSettingsSuccess', 'Report history refreshed!');
    });
  }
  
  const clearReportsBtn = document.getElementById('clearReportHistory');
  if (clearReportsBtn) {
    clearReportsBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all saved reports? This cannot be undone.')) {
        chrome.storage.local.set({ aiReports: [] }, () => {
          loadReportHistory();
          showSuccess('aiSettingsSuccess', 'All reports cleared!');
        });
      }
    });
  }
  
  const closeReportViewerBtn = document.getElementById('closeReportViewer');
  if (closeReportViewerBtn) {
    closeReportViewerBtn.addEventListener('click', closeReportViewer);
  }
  
  // Data management
  const exportAllBtn = document.getElementById('exportAllBtn');
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', exportAllData);
  }
  
  const backupBtn = document.getElementById('backupBtn');
  if (backupBtn) {
    backupBtn.addEventListener('click', createBackup);
  }
  
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => {
      importFile.click();
    });
    importFile.addEventListener('change', importData);
  }
  
  const clearDataBtn = document.getElementById('clearDataBtn');
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', clearAllData);
  }
  
  // Modal close on outside click
  const goalModal = document.getElementById('goalModal');
  if (goalModal) {
    goalModal.addEventListener('click', (e) => {
      if (e.target === goalModal) {
        goalModal.classList.remove('active');
      }
    });
  }
  
  // Social sharing
  setupSocialSharingButtons();
}

// ============================================
// AI TAB INITIALIZATION
// ============================================

async function initializeAITab() {
  console.log('Initializing AI tab...');
  
  try {
    // Setup API key management
    setupApiKeyManagement();
    
    // Load custom models (await if it's async)
    await loadCustomModels();
    
    // Setup custom model modal
    setupCustomModelModal();
    
    // Load report history
    loadReportHistory();
    
    // Load AI settings
    loadAiSettings();
    
    // Load custom templates
    loadCustomTemplates();
    
    // Initialize AI Reports if available - with proper checks
    setTimeout(() => {
      if (window.UnifiedAIReports) {
        // Check if we're on a page that needs unified reports
        const needsReports = document.getElementById('ai-reports-container') || 
                           document.getElementById('unifiedReportsTab') ||
                           document.querySelector('[data-tab="ai-reports"]') ||
                           document.getElementById('reportHistory');
        
        if (needsReports) {
          console.log('Initializing UnifiedAIReports...');
          window.aiReports = new UnifiedAIReports();
          window.aiReports.init().catch(err => {
            // Non-critical error - just log it
            console.log('UnifiedAIReports initialization note:', err.message);
          });
        } else {
          console.log('UnifiedAIReports not needed on this page');
        }
      }
    }, 100);
    
  } catch (error) {
    console.error('Error initializing AI tab:', error);
    // Continue execution even if something fails
  }
}
// ============================================
// PAGE INITIALIZATION
// ============================================

function initializePage() {
  console.log('Initializing options page...');
  
  try {
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
    
    // Setup AI tab listener
    const aiTabBtn = document.querySelector('.tab-button[data-tab="ai"]');
    if (aiTabBtn) {
      aiTabBtn.addEventListener('click', () => {
        setTimeout(initializeAITab, 100);
      });
    }
    
    // Check if AI tab is already active
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'aiTab') {
      setTimeout(initializeAITab, 200);
    }
    
    console.log('Page initialization complete');
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// ============================================
// DOM READY HANDLER
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Initializing...');
  
  if (!pageInitialized) {
    initializePage();
    pageInitialized = true;
  }
});

// Fallback for already loaded document
if (document.readyState !== 'loading' && !pageInitialized) {
  setTimeout(() => {
    if (!pageInitialized) {
      initializePage();
      pageInitialized = true;
    }
  }, 100);
}

// Save categories order after drag and drop
window.addEventListener('dragend', function() {
  const categoryItems = document.querySelectorAll('.category-item');
  if (categoryItems.length > 0) {
    const categories = Array.from(categoryItems).map(item => {
      const nameElement = item.querySelector('.category-name');
      return nameElement ? nameElement.textContent : null;
    }).filter(Boolean);
    
    if (categories.length > 0) {
      chrome.storage.local.set({ categories }, () => {
        loadQuickActions();
      });
    }
  }
});

// Export functions for use in other scripts
window.loadReportHistory = loadReportHistory;
window.loadCustomModels = loadCustomModels;
window.setupCustomModelModal = setupCustomModelModal;