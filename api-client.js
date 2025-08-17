// api-client.js - Complete Enhanced LLM API Integration
class UnifiedAPIClient {  
  constructor() {
    this.providers = {
      openai: {
        name: 'OpenAI',
        models: [
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 128000, default: true },
          { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 128000 },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 128000 },
          { id: 'gpt-4', name: 'GPT-4', maxTokens: 8192 },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 16385 }
        ],
        endpoint: 'https://api.openai.com/v1/chat/completions',
        defaultParams: {
          temperature: 0.7,
          max_tokens: 8000,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        }
      },
      anthropic: {
        name: 'Anthropic',
        models: [
          // Claude 4 models (latest and most capable)
          { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1', maxTokens: 200000, default: true },
          { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', maxTokens: 200000 },
          { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', maxTokens: 200000 },
          
          // Claude 3.5 (use latest alias instead of deprecated version)
          { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet (Latest)', maxTokens: 200000 },
          
          // Claude 3 models (still supported)
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', maxTokens: 200000 },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', maxTokens: 200000 },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', maxTokens: 200000 }
        ],
        endpoint: 'https://api.anthropic.com/v1/messages',
        defaultParams: {
          temperature: 0.7,
          max_tokens: 8000
        }
      },
      google: {
        name: 'Google',
        models: [
          // Use stable versions for production
          { id: 'gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', maxTokens: 1048576, default: true },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', maxTokens: 1048576 },
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', maxTokens: 2097152 },
          
          // Preview/experimental models (may have different rate limits)
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Preview)', maxTokens: 1048576 },
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Preview)', maxTokens: 2097152 }
        ],
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
        defaultParams: {
          temperature: 0.7,
          maxOutputTokens: 16000,
          topP: 1,
          topK: 40
        }
      }
    };
    
    // Load custom models on initialization
    this.loadCustomModels();
  }

  // Load custom models from storage and merge with defaults
  async loadCustomModels() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customModels'], (result) => {
        const byProvider = result.customModels || {};
        
        Object.keys(this.providers).forEach((provider) => {
          // Get default models for this provider
          const defaultModels = this.providers[provider].models || [];
          
          // Get custom models for this provider
          const customModels = Array.isArray(byProvider[provider]) ? byProvider[provider] : [];
          
          // Clean and validate custom models
          const cleanedCustom = customModels
            .filter(m => m && m.id && m.name)
            .map(m => ({ 
              id: m.id, 
              name: m.name,
              maxTokens: parseInt(m.maxTokens) || 128000,
              default: !!m.default,
              isCustom: true
            }));
          
          // Merge models - custom models override defaults with same ID
          const mergedModels = [...defaultModels];
          
          cleanedCustom.forEach(customModel => {
            const existingIndex = mergedModels.findIndex(m => m.id === customModel.id);
            if (existingIndex >= 0) {
              // Replace default with custom
              mergedModels[existingIndex] = customModel;
            } else {
              // Add new custom model
              mergedModels.push(customModel);
            }
          });
          
          // Ensure at least one default model exists
          if (!mergedModels.some(m => m.default) && mergedModels.length > 0) {
            mergedModels[0].default = true;
          }
          
          this.providers[provider].models = mergedModels;
        });
        
        resolve();
      });
    });
  }

  // Get API key from storage
  async getApiKey(provider) {
    return new Promise((resolve) => {
      chrome.storage.local.get([`${provider}ApiKey`], (result) => {
        resolve(result[`${provider}ApiKey`] || null);
      });
    });
  }

  // Save API key to storage
  async saveApiKey(provider, key) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [`${provider}ApiKey`]: key }, resolve);
    });
  }

  // Test API key with actual API call
  async testApiKey(provider) {
    const apiKey = await this.getApiKey(provider);
    if (!apiKey) {
      throw new Error('No API key found');
    }

    const testPrompt = "Say 'API key working!' in 5 words or less.";
    
    try {
      switch(provider) {
        case 'openai':
          return await this.testOpenAI(apiKey, testPrompt);
        case 'anthropic':
          return await this.testAnthropic(apiKey, testPrompt);
        case 'google':
          return await this.testGoogle(apiKey, testPrompt);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Test failed for ${provider}:`, error);
      throw error;
    }
  }

  // Test OpenAI API
  async testOpenAI(apiKey, prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 20,
        temperature: 0.5
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return true;
  }

  // Test Anthropic API
  async testAnthropic(apiKey, prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 20
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return true;
  }

  // Test Google API
  async testGoogle(apiKey, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: 20,
          temperature: 0.5
        }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return true;
  }

  // Main method to generate report with any LLM
  async generateReport(options) {
    // Reload custom models before generating
    await this.loadCustomModels();
    
    const {
      provider,
      model,
      systemPrompt,
      userPrompt,
      data,
      parameters = {},
      includeCharts = true,
      template = 'custom'
    } = options;

    const apiKey = await this.getApiKey(provider);
    if (!apiKey) {
      throw new Error(`No API key found for ${provider}. Please add your API key in the settings.`);
    }

    // Format data for the prompt
    const formattedData = JSON.stringify(data, null, 2);
    const fullPrompt = `${userPrompt}\n\nData:\n\`\`\`json\n${formattedData}\n\`\`\``;

    let response;
    
    switch(provider) {
      case 'openai':
        response = await this.callOpenAI(apiKey, model, systemPrompt, fullPrompt, parameters);
        break;
      case 'anthropic':
        response = await this.callAnthropic(apiKey, model, systemPrompt, fullPrompt, parameters);
        break;
      case 'google':
        response = await this.callGoogle(apiKey, model, systemPrompt, fullPrompt, parameters);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Process response and generate HTML with full markup support
    const report = {
      content: response,
      html: this.formatReportHTML(response, includeCharts ? data : null),
      htmlContent: this.formatReportHTML(response, includeCharts ? data : null),
      provider,
      model,
      template,
      title: `AI Report - ${new Date().toLocaleDateString()}`,
      data: includeCharts ? data : null,
      chartData: includeCharts ? this.parseChartData(data, 'Time Tracking') : null,
      timestamp: new Date().toISOString()
    };

    return report;
  }

  // Call OpenAI API
  async callOpenAI(apiKey, model, systemPrompt, userPrompt, parameters) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        ...this.providers.openai.defaultParams,
        ...parameters
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }


  // Call Anthropic API
  async callAnthropic(apiKey, model, systemPrompt, userPrompt, parameters) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'  // ← ADD THIS LINE
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        ...this.providers.anthropic.defaultParams,
        ...parameters
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    return data.content[0].text;
  }

  // Call Google API
// Fixed callGoogle method with better error handling
async callGoogle(apiKey, model, systemPrompt, userPrompt, parameters) {
  // Map common parameter names to Google's expected format
  const generationConfig = {
    temperature: parameters.temperature || this.providers.google.defaultParams.temperature,
    maxOutputTokens: parameters.max_tokens || this.providers.google.defaultParams.maxOutputTokens,
    topP: parameters.top_p || this.providers.google.defaultParams.topP,
    topK: parameters.top_k || this.providers.google.defaultParams.topK
  };

  // Remove undefined values from generationConfig
  Object.keys(generationConfig).forEach(key => {
    if (generationConfig[key] === undefined) {
      delete generationConfig[key];
    }
  });

  // Build the request body
  const requestBody = {
    contents: [{
      parts: [{ text: userPrompt }]
    }],
    generationConfig: generationConfig
  };

  // Add system instruction if provided (for Gemini 1.5+ models)
  if (systemPrompt) {
    requestBody.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const response = await fetch(`${this.providers.google.endpoint}${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Google API error');
  }

  const data = await response.json();
  
  // Check if we have valid candidates
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response generated from Google API');
  }

  const candidate = data.candidates[0];
  
  // Check finish reason first
  if (candidate.finishReason) {
    switch (candidate.finishReason) {
      case 'MAX_TOKENS':
        // Handle MAX_TOKENS - either the prompt was too long or output limit reached
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
          throw new Error('Request exceeded token limits. Try reducing the prompt length or increasing maxOutputTokens.');
        }
        // If we have partial content, we can still return it
        console.warn('Response was truncated due to token limit');
        break;
      case 'SAFETY':
        throw new Error('Response blocked due to safety filters');
      case 'RECITATION':
        throw new Error('Response blocked due to recitation concerns');
      case 'STOP':
        // Normal completion
        break;
      default:
        console.warn(`Unexpected finish reason: ${candidate.finishReason}`);
    }
  }
  
  // Try to extract the text content
  if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
    const text = candidate.content.parts[0].text;
    if (text !== undefined && text !== null) {
      return text;
    }
  }
  
  // If we couldn't find any text content
  console.error('Unexpected Google API response structure:', JSON.stringify(data, null, 2));
  
  // Provide more helpful error message based on what we found
  if (candidate.finishReason === 'MAX_TOKENS' && (!candidate.content || !candidate.content.parts)) {
    throw new Error('The prompt is too long for the selected model. Please try:\n' +
                    '1. Using a shorter prompt\n' +
                    '2. Increasing maxOutputTokens in parameters\n' +
                    '3. Using a model with higher token limits (e.g., Gemini 1.5 Pro)');
  }
  
  throw new Error('No text content in Google API response');
}

  // Enhanced HTML formatting with table and markup support
  formatReportHTML(content, data = null) {
    let html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333;">
        <style>
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: 600; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-family: monospace; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
          blockquote { border-left: 4px solid #667eea; margin: 20px 0; padding-left: 20px; color: #555; }
          h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
          h1 { font-size: 2em; border-bottom: 2px solid #e1e4e8; padding-bottom: 10px; }
          h2 { font-size: 1.5em; border-bottom: 1px solid #e1e4e8; padding-bottom: 8px; }
          h3 { font-size: 1.25em; }
          ul, ol { margin: 10px 0; padding-left: 30px; }
          li { margin: 5px 0; }
          .chart-container { margin: 20px 0; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .highlight { background-color: #fff3cd; padding: 2px 4px; }
          .metric { display: inline-block; margin: 10px 20px 10px 0; }
          .metric-value { font-size: 24px; font-weight: bold; color: #667eea; }
          .metric-label { font-size: 14px; color: #666; }
        </style>
    `;

    // Convert markdown-style content to HTML
    if (typeof content === 'string') {
      // Process the content line by line
      const lines = content.split('\n');
      let inCodeBlock = false;
      let inTable = false;
      let tableContent = [];
      let listStack = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Code blocks
        if (trimmedLine.startsWith('```')) {
          if (inCodeBlock) {
            html += '</code></pre>';
            inCodeBlock = false;
          } else {
            const language = trimmedLine.slice(3).trim();
            html += `<pre><code class="${language}">`;
            inCodeBlock = true;
          }
          continue;
        }
        
        if (inCodeBlock) {
          html += this.escapeHtml(line) + '\n';
          continue;
        }
        
        // Tables (Markdown style)
        if (trimmedLine.includes('|')) {
          if (!inTable) {
            inTable = true;
            tableContent = [];
          }
          tableContent.push(trimmedLine);
          
          // Check if next line is not a table line to close the table
          if (i === lines.length - 1 || !lines[i + 1].trim().includes('|')) {
            html += this.parseMarkdownTable(tableContent);
            inTable = false;
            tableContent = [];
          }
          continue;
        }
        
        // Headers
        if (trimmedLine.startsWith('#')) {
          const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            html += `<h${level}>${this.processInlineMarkdown(headerMatch[2])}</h${level}>`;
            continue;
          }
        }
        
        // Lists
        const unorderedMatch = trimmedLine.match(/^[\*\-\+]\s+(.+)/);
        const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/);
        
        if (unorderedMatch || orderedMatch) {
          const isOrdered = !!orderedMatch;
          const content = unorderedMatch ? unorderedMatch[1] : orderedMatch[2];
          const currentType = isOrdered ? 'ol' : 'ul';
          
          if (listStack.length === 0 || listStack[listStack.length - 1] !== currentType) {
            if (listStack.length > 0) {
              html += `</${listStack.pop()}>`;
            }
            html += `<${currentType}>`;
            listStack.push(currentType);
          }
          
          html += `<li>${this.processInlineMarkdown(content)}</li>`;
          
          // Check if next line is not a list item
          if (i === lines.length - 1 || (!lines[i + 1].trim().match(/^[\*\-\+\d]+[\.\s]/))) {
            while (listStack.length > 0) {
              html += `</${listStack.pop()}>`;
            }
          }
          continue;
        }
        
        // Blockquotes
        if (trimmedLine.startsWith('>')) {
          const quoteContent = trimmedLine.slice(1).trim();
          html += `<blockquote>${this.processInlineMarkdown(quoteContent)}</blockquote>`;
          continue;
        }
        
        // Horizontal rules
        if (trimmedLine.match(/^[\*\-_]{3,}$/)) {
          html += '<hr>';
          continue;
        }
        
        // Charts (if data is provided)
        if (trimmedLine.includes('[Chart:') && data) {
          html += this.generateChartHTML(trimmedLine, data);
          continue;
        }
        
        // Regular paragraphs
        if (trimmedLine) {
          html += `<p>${this.processInlineMarkdown(trimmedLine)}</p>`;
        }
      }
      
      // Close any open lists
      while (listStack.length > 0) {
        html += `</${listStack.pop()}>`;
      }
    } else {
      // If content is not a string, convert to formatted JSON
      html += `<pre><code>${JSON.stringify(content, null, 2)}</code></pre>`;
    }

    // Add footer
    html += `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e1e4e8; color: #666; font-size: 12px; text-align: center;">
          <p>Generated by AI Time Tracker Extension on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    return html;
  }

  // Parse Markdown table
  parseMarkdownTable(lines) {
    if (lines.length < 2) return '';
    
    let html = '<table>';
    let isHeader = true;
    
    for (const line of lines) {
      // Skip separator lines (---|---|---)
      if (line.match(/^\|?\s*[\-:]+\s*\|/)) {
        continue;
      }
      
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
      
      if (cells.length > 0) {
        html += '<tr>';
        const tag = isHeader ? 'th' : 'td';
        
        for (const cell of cells) {
          html += `<${tag}>${this.processInlineMarkdown(cell)}</${tag}>`;
        }
        
        html += '</tr>';
        
        if (isHeader) {
          isHeader = false;
        }
      }
    }
    
    html += '</table>';
    return html;
  }

  // Process inline markdown (bold, italic, code, links)
  processInlineMarkdown(text) {
    if (!text) return '';
    
    let processed = this.escapeHtml(text);
    
    // Bold
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic
    processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
    processed = processed.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Code
    processed = processed.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Highlights
    processed = processed.replace(/==(.+?)==/g, '<span class="highlight">$1</span>');
    
    return processed;
  }

  // Escape HTML special characters
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // Generate chart HTML
  generateChartHTML(chartDescription, data) {
    const match = chartDescription.match(/\[Chart:\s*(.+?)\]/);
    if (!match) return '';

    const chartType = match[1].toLowerCase();
    const chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    
    return `
      <div class="chart-container" data-chart-type="${chartType}" data-chart-id="${chartId}">
        <canvas id="${chartId}" width="400" height="200"></canvas>
      </div>
    `;
  }

  // Parse data for charts
  parseChartData(data, dataRef) {
    const chartData = {
      labels: [],
      datasets: [{
        label: dataRef,
        data: [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
      }]
    };

    // Extract data based on structure
    if (data?.categoryBreakdown) {
      chartData.labels = Object.keys(data.categoryBreakdown);
      chartData.datasets[0].data = Object.values(data.categoryBreakdown).map(c => c.totalHours || 0);
    } else if (data?.dailyPatterns) {
      chartData.labels = Object.keys(data.dailyPatterns);
      chartData.datasets[0].data = Object.values(data.dailyPatterns).map(d => d.totalHours || 0);
    } else if (data?.summary) {
      chartData.labels = ['Total Hours', 'Tasks', 'Meetings'];
      chartData.datasets[0].data = [
        data.summary.totalHours || 0,
        data.summary.uniqueTasks || 0,
        data.summary.meetingsCount || 0
      ];
    }

    return chartData;
  }

  // Convert HTML to email-friendly format
  async convertToEmailHTML(content) {
    // Simplify HTML for email clients
    let emailHTML = content;
    
    // Convert to inline styles for better email compatibility
    emailHTML = emailHTML.replace(/<strong>/g, '<b style="font-weight:bold;">');
    emailHTML = emailHTML.replace(/<\/strong>/g, '</b>');
    emailHTML = emailHTML.replace(/<em>/g, '<i style="font-style:italic;">');
    emailHTML = emailHTML.replace(/<\/em>/g, '</i>');
    
    // Wrap in email-friendly container
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${emailHTML}
      </div>
    `;
  }

  // Get all available models for a provider
  async getAllModels(provider) {
    await this.loadCustomModels();
    return this.providers[provider]?.models || [];
  }

  // Add custom model
  async addCustomModel(provider, model) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customModels'], (result) => {
        const models = result.customModels || {};
        
        if (!models[provider]) {
          models[provider] = [];
        }
        
        // Remove existing model with same ID
        models[provider] = models[provider].filter(m => m.id !== model.id);
        
        // Add new model
        models[provider].push(model);
        
        chrome.storage.local.set({ customModels: models }, () => {
          this.loadCustomModels().then(() => resolve());
        });
      });
    });
  }

  // Remove custom model
  async removeCustomModel(provider, modelId) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customModels'], (result) => {
        const models = result.customModels || {};
        
        if (models[provider]) {
          models[provider] = models[provider].filter(m => m.id !== modelId);
          
          if (models[provider].length === 0) {
            delete models[provider];
          }
          
          chrome.storage.local.set({ customModels: models }, () => {
            this.loadCustomModels().then(() => resolve());
          });
        } else {
          resolve();
        }
      });
    });
  }

  // Save report to storage
  async saveReport(report) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['aiReports'], (result) => {
        const reports = result.aiReports || [];
        
        const reportToSave = {
          id: `report_${Date.now()}`,
          createdAt: new Date().toISOString(),
          ...report
        };
        
        reports.unshift(reportToSave);
        
        // Keep only last 50 reports
        if (reports.length > 50) {
          reports.length = 50;
        }
        
        chrome.storage.local.set({ aiReports: reports }, () => resolve(reportToSave));
      });
    });
  }

  // Clear all reports
  async clearAllReports() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ aiReports: [] }, () => {
        resolve(true);
      });
    });
  }
}

// CRITICAL: Make the class available globally with BOTH names for compatibility
window.UnifiedAPIClient = UnifiedAPIClient;
window.LLMApiClient = UnifiedAPIClient; // Alias for backward compatibility