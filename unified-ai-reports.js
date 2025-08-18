// unified-ai-reports.js - Complete refactored AI report generation system

class UnifiedAIReports {
  constructor() {
      // Initialize enhanced templates that surface actual work
      this.templates = {
        productivity: {
          system: `You are a productivity analyst who helps people understand what they accomplished. Focus on surfacing the actual tasks, projects, and work completed. Use ONLY the data provided - never invent examples or fill in blanks. If data is missing, skip that section. Always quote actual task names and descriptions from the data.
  
  IMPORTANT:  Do not make any reference to deliverables, project, or task by the ID string, always  use the human redable names.Format your response as a professional report using rich Markdown formatting:
  - Use proper heading hierarchy (H1, H2, H3)
  - Bold key metrics and important findings
  - Use tables for structured data comparisons
  - Include bullet points and numbered lists for clarity
  - Add horizontal rules to separate major sections
  - Use blockquotes for important insights
  - Apply inline code formatting for task IDs or technical terms
  - Ensure the report is visually scannable and professional`,
          
          user: `Analyze my time tracking data and tell me what I actually accomplished. Focus on the real work I did, not just statistics.
  
  **FORMAT AS A PROFESSIONAL REPORT** using proper markup:
  - Use tables to organize task lists and time breakdowns
  - Bold important metrics and accomplishments
  - Use styled lists for better readability
  - Include visual separators between sections
  - Apply appropriate emphasis to key findings
  
  ## Required Sections:
  
  ### 📋 **What I Actually Did**
  Present as a formatted table or structured list:
  - The exact task names and descriptions from the data
  - How much time I spent on each (format: **XX hours**)
  - Any deliverables or outputs noted
  - Don't summarize - show me the actual work items
  - Use a table with columns: Task Name | Time Spent | Status | Notes
  
  ### 🎯 **Main Accomplishments**
  Format as a highlighted list with emphasis:
  - Tasks marked as completed (use ✅ checkmarks)
  - Deliverables mentioned in the data (**bold** the deliverable names)
  - Major time investments that produced outputs
  - Quote the actual task/project names in \`inline code\` format
  
  ### ⏰ **Where My Time Went**
  Present as a structured breakdown with visual hierarchy:
  - Create a table showing: Category | Specific Tasks | Total Time | Percentage
  - Include any notes or context from the task descriptions
  - Show which projects consumed the most time with **bold** emphasis
  - Surface any recurring tasks or patterns in *italics*
  
  ### 🔄 **Work Patterns I Can See**
  Use formatting to highlight patterns:
  - Present time blocks as a formatted timeline or table
  - Task switching patterns with actual task names in \`code blocks\`
  - Focused work sessions on specific projects (**bold** focus periods)
  - Meeting patterns with actual meeting names/topics in a structured list
  
  ### 📝 **Context from My Notes**
  Format as styled blockquotes or callout boxes:
  > Problems I mentioned
  > Decisions I documented  
  > Progress updates I noted
  
  Use exact quotes with proper quotation formatting
  
  ### 💡 **Insights from My Actual Work**
  Present as a professional analysis with:
  - **Key Finding:** followed by explanation
  - Use tables to compare planned vs actual time if goals exist
  - Highlight bottlenecks in **bold** or with ⚠️ warnings
  - Create sub-sections with proper heading hierarchy
  
  ### 🎯 **Recommendations Based on What I Did**
  Format as an actionable list with priority markers:
  1. **High Priority:** [specific recommendation]
  2. **Medium Priority:** [specific recommendation]
  3. **Consider:** [specific recommendation]
  
  Use tables to show time-saving opportunities
  Always reference specific tasks, projects, and actual work items from the data.`
        },
  
        weekly: {
          system: `You are a weekly review specialist who helps people see what they actually accomplished over the week. Focus on listing real tasks and projects from the data. Never invent examples or use placeholders. Always quote actual work items.
  
  IMPORTANT:  Do not make any reference to deliverables, project, or task by the ID string, always  use the human redable names.Create a polished, professional weekly report using rich markdown formatting:
  - Structure content with clear visual hierarchy
  - Use tables for daily/project breakdowns
  - Apply consistent styling throughout
  - Make the report suitable for sharing with managers or teams
  - Ensure professional presentation with proper markup`,
          
          user: `Create a weekly review showing what I actually did this week. Focus on real tasks and accomplishments, not just metrics.
  
  **DELIVER A PROFESSIONAL WEEKLY REPORT** with proper formatting:
  - Use tables for structured data
  - Apply visual emphasis to key achievements
  - Create clear sections with horizontal rules
  - Make it shareable and professional-looking
  
  ### 📅 **This Week's Actual Work**
  Present in a **formatted daily table**:
  | Day | Tasks Worked On | Time Spent | Completed |
  |-----|----------------|------------|-----------|
  Include actual task names with proper formatting
  
  ### 🏆 **What I Completed**
  **Format as a success showcase:**
  - ✅ **Task Name** - *Time taken: X hours*
    - Deliverable details (if any)
    - Completion notes in blockquotes
  - Use green highlighting or checkmarks for completed items
  
  ### 🔄 **Ongoing Projects**
  Present in a **project status table**:
  | Project | Tasks This Week | Time Invested | Progress | Next Steps |
  |---------|----------------|---------------|----------|------------|
  Include progress percentages where available
  
  ### 📊 **Project Time Breakdown**
  Create a **formatted breakdown table**:
  | Project/Category | Tasks | Total Time | % of Week |
  |-----------------|-------|------------|-----------|
  Include visual indicators for high-time items
  
  ### 🗓️ **Daily Activity Summary**
  **Day-by-day formatted cards:**
  #### Monday
  - **Morning:** [tasks]
  - **Afternoon:** [tasks]
  - **Key Achievement:** [highlight]
  
  [Repeat for each day with consistent formatting]
  
  ### 📝 **My Notes and Context**
  Format notes in **styled callout boxes:**
  > **Challenge:** [exact quote]
  > **Decision:** [exact quote]
  > **Idea:** [exact quote]
  
  ### 🎯 **Next Week Preparation**
  **Formatted action list with priorities:**
  | Priority | Task/Project | Estimated Time | Deadline |
  |----------|--------------|----------------|----------|
  | 🔴 High  | [task name]  | X hours        | [date]   |
  | 🟡 Medium| [task name]  | X hours        | [date]   |
  
  Focus entirely on what I actually did, using real task names and descriptions from the data.`
        },
  
        daily: {
          system: `You are a daily review coach who helps people understand their actual daily accomplishments. List real tasks and work done. Never use placeholders or examples not in the data.
  
  IMPORTANT:  Do not make any reference to deliverables, project, or task by the ID string, always  use the human redable names.Format as a clean, professional daily report using rich markdown:
  - Use time-based formatting for chronological flow
  - Apply visual cues for different task types
  - Make it easy to scan and understand at a glance
  - Professional enough to share with team or manager`,
          
          user: `Show me what I actually did today based on my time tracking data.
  
  **CREATE A PROFESSIONAL DAILY REPORT** with proper formatting:
  - Use timeline formatting for chronological view
  - Apply visual markers for task status
  - Make it scannable and well-organized
  
  ### 📋 **Today's Task Timeline**
  **Format as a time-based table:**
  | Time | Task | Duration | Category | Notes |
  |------|------|----------|----------|-------|
  | 9:00 AM | [exact task] | 45 min | [category] | [notes] |
  
  ### ✅ **What I Completed**
  **Formatted completion list:**
  - ✅ **[Task Name]** *(Duration: X hours)*
    - Deliverable: [if any]
    - Goal connection: [if any]
  
  ### 🔄 **What I Started/Continued**
  **Progress table:**
  | Task/Project | Time Today | Total Progress | Next Steps |
  |--------------|------------|----------------|------------|
  Format with emphasis on current status
  
  ### 🏷️ **Categories of Work**
  **Visual category breakdown:**
  Category 1: [Name] (X hours)
  ├── Task 1: [details]
  ├── Task 2: [details]
  └── Task 3: [details]
  
  Category 2: [Name] (Y hours)
  ├── Task 1: [details]
  └── Task 2: [details]
  
  ### 💭 **My Notes from Today**
  **Formatted note cards:**
  > 📌 **Note Type:** [Context]
  > *"Exact quote from my notes"*
  
  ### 🎯 **For Tomorrow**
  **Formatted priority list:**
  1. 🔴 **High Priority:** [Specific task to continue]
  2. 🟡 **Medium:** [Follow-up needed]
  3. 🟢 **Routine:** [Recurring task]
  
  Show me the real work I did, not statistics about it.`
        },
  
        team: {
          system: `You are a team collaboration analyst who surfaces actual collaborative work and team interactions. Use only real data about meetings, projects, and team activities. Never invent examples.
  
  IMPORTANT:  Do not make any reference to deliverables, project, or task by the ID string, always  use the human redable names.Create a professional team collaboration report using rich markdown:
  - Use tables for meeting summaries
  - Apply formatting to highlight collaborative efforts
  - Make it suitable for team reviews or manager updates
  - Ensure clear visual organization
  - Skip sections if data is not available`,
          
          user: `Analyze my actual team-related work and collaboration from the time tracking data.
  
  **FORMAT AS A PROFESSIONAL TEAM REPORT** with proper markup:
  - Use structured tables for meetings and collaborations
  - Apply visual emphasis to key team achievements
  - Make it shareable with team members
  
  ### 👥 **Team Activities I Participated In**
  **Formatted activity table:**
  | Activity Type | Task/Meeting Name | Duration | Category | Notes |
  |---------------|------------------|----------|----------|-------|
  Include all collaborative work with proper categorization
  
  ### 📅 **Meetings I Attended**
  **Professional meeting summary table:**
  | Meeting | Time | Duration | Purpose | Notes |
  |---------|------|----------|---------|-------|
  Format with clear visual hierarchy
  
  ### 🤝 **Collaborative Work**
  **Structured collaboration breakdown:**
  - **Project:** [Name]
    - **My Contribution:** [specific tasks]
    - **Time Invested:** **X hours**
    - **Output:** [deliverables if any]
  
  ### 📊 **Project Contributions**
  **Team project table:**
  | Project | My Tasks | Time | Deliverables | Status |
  |---------|----------|------|--------------|--------|
  Use status badges: 🟢 Complete | 🟡 In Progress | 🔴 Blocked
  
  ### 💬 **Communication Work**
  **Communication summary (if data exists):**
  - **📧 Emails:** [specific tasks with time]
  - **📝 Documentation:** [created/updated with details]
  - **💬 Updates:** [provided with context]
  
  ### 📝 **Team-Related Notes**
  **Formatted notes from the data:**
  > **Note:** [exact quote]
  > **Context:** [if provided]
  
  ### 🎯 **Team Efficiency Insights**
  **Key findings with visual emphasis:**
  - **Meeting Time:** [total time in meetings]
  - **Collaboration Patterns:** [actual patterns observed]
  - **Optimization Opportunities:** [specific suggestions]
  
  List real team interactions and collaborative work from the data.`
        },
  
        client: {
          system: `You are a client work analyst who helps track actual projects and deliverables. Focus on real work, projects, and tasks from the data. Never use generic examples. Skip any sections where data is not available.
  
  IMPORTANT:  Do not make any reference to deliverables, project, or task by the ID string, always  use the human redable names.Create a professional project report using rich markdown suitable for:
  - Internal project reviews
  - Status updates
  - Time tracking summaries
  - Portfolio documentation
  Use proper formatting for professional presentation`,
          
          user: `Show me the actual project work I did based on my time tracking data.
  
  **CREATE A PROFESSIONAL PROJECT REPORT** with polished formatting:
  - Use tables for project breakdowns
  - Apply visual status indicators
  - Make it suitable for management review
  
  ### 💼 **Projects Worked On**
  **Professional project summary table:**
  | Project/Category | Tasks Completed | Time Spent | Status | Notes |
  |------------------|-----------------|------------|--------|-------|
  Group by project with sub-tasks properly indented
  
  ### ✅ **Deliverables Completed**
  **Formatted deliverable showcase:**
  - ✅ **[Deliverable Name]** 
    - **Time Investment:** X hours
    - **Related Goal:** [if connected]
    - **Notes:** [if any]
  
  ### 🔄 **Ongoing Work**
  **Active work status table:**
  | Project | Task | Time So Far | Status | Next Steps |
  |---------|------|-------------|--------|------------|
  Use progress indicators where applicable
  
  ### 📋 **Task Breakdown by Project**
  **Detailed time allocation:**
  Project A: [Name] (Total: X hours)
  ├── Task Type 1: Y hours
  │   ├── Subtask 1: [details]
  │   └── Subtask 2: [details]
  ├── Task Type 2: Z hours
  └── Task Type 3: W hours
  
  ### 📝 **Project Notes**
  **Formatted notes and context:**
  > **Project:** [Name]
  > **Note:** [exact quote from data]
  > **Action:** [if any]
  
  ### ⏱️ **Time Investment Summary**
  **Professional time tracking table:**
  | Project/Category | Tasks | Time Spent | % of Total | Priority |
  |------------------|-------|------------|------------|----------|
  Include totals row with **bold** formatting
  
  ### 🎯 **Project Insights**
  **Executive summary with key metrics:**
  - **Most Time-Intensive:** [Project] - **X hours**
  - **Completed Deliverables:** [Count and list]
  - **Efficiency Opportunities:** [specific recommendations]
  
  Show the actual project work completed, not just summaries.`
        },
  
        executive: {
          system: `You are an executive summary specialist who distills actual work into high-level insights. Focus on real projects, decisions, and strategic work from the data. Never use placeholders. Skip sections where data is not available.
  
  IMPORTANT:  Do not make any reference to deliverables, project, or task by the ID string, always  use the human redable names.Create an executive-level report using rich markdown with:
  - Professional formatting suitable for leadership
  - Clear visual hierarchy and emphasis
  - Data-driven insights with proper presentation
  - Actionable recommendations with visual priority
  - Polished, professional appearance`,
          
          user: `Create an executive summary of my actual work and time allocation.
  
  **DELIVER AN EXECUTIVE-LEVEL REPORT** with professional formatting:
  - Use executive summary boxes
  - Apply visual KPIs and metrics
  - Create professional presentation
  
  ### 🎯 **Executive Summary**
  **[Create a highlighted summary box with key metrics]**
  > **Total Productive Hours:** X
  > **Tasks Completed:** Y
  > **Key Categories:** [list top 3]
  > **Goals Progress:** [if tracked]
  
  ### 📊 **Strategic Time Allocation**
  **High-level breakdown table:**
  | Category | Projects/Tasks | Time Investment | % of Total | Notes |
  |----------|----------------|-----------------|------------|-------|
  | [Category] | [actual projects] | X hours | XX% | [context] |
  
  ### ✅ **Key Accomplishments**
  **Impact-focused achievement list:**
  1. **🏆 [Major Task/Project]**
     - Time Investment: X hours
     - Deliverables: [if any]
     - Goal Connection: [if tracked]
  
  ### 🔄 **Major Ongoing Work**
  **Strategic work dashboard:**
  | Project/Task | Progress | Time Invested | Category | Next Steps |
  |--------------|----------|---------------|----------|------------|
  | [Name] | [status] | Y hours | [category] | [specific] |
  
  ### 💡 **Work Insights**
  **Key observations from the data:**
  > **Pattern:** [observed pattern]
  > **Finding:** [data-based finding]
  > **Opportunity:** [improvement area]
  
  ### 📈 **Performance Metrics**
  **KPI Dashboard (based on available data):**
  - **Focus Time:** [longest uninterrupted sessions]
  - **Task Completion:** [completed vs started]
  - **Category Distribution:** [top categories by time]
  - **Multi-tasking:** [if tracked]
  
  ### 🎯 **Strategic Recommendations**
  **Actionable recommendations with priority:**
  1. **Immediate Action:** [specific recommendation based on data]
  2. **Short-term Optimization:** [specific improvement]
  3. **Long-term Consideration:** [strategic suggestion]
  
  Focus on surfacing the real work and patterns from the time tracking data.`
        },

        // NEW TEMPLATES ADDED BELOW

        focus: {
          system: `You are a deep work analyst who identifies focus patterns and concentration blocks. Use ONLY actual data provided. Never fabricate examples. If data for a section doesn't exist, skip it.
          
          IMPORTANT:  Do not make any reference to deliverables, project, or task by the ID string, always  use the human redable names.Create a professional focus analysis report using rich markdown:
          - Use visual formatting to highlight focus periods
          - Apply time-based analysis with proper structure
          - Make insights actionable and data-driven
          - Professional presentation suitable for personal optimization`,
          
          user: `Analyze my focus time and deep work sessions from the time tracking data.
          
          **CREATE A FOCUS ANALYSIS REPORT** with professional formatting:
          
          ### 🎯 **Focus Sessions Analysis**
          **Deep work session table:**
          | Session Start | Task/Project | Duration | Interruptions | Category |
          |---------------|--------------|----------|---------------|----------|
          List actual uninterrupted work blocks
          
          ### ⏱️ **Longest Focus Blocks**
          **Top concentration periods:**
          1. **[Task Name]** - *Duration: X hours*
             - Time: [start-end]
             - Category: [category]
             - Notes: [if any]
          
          ### 🔄 **Context Switching Patterns**
          **Task switching analysis:**
          | Time Period | Tasks Switched Between | Frequency | Impact |
          |-------------|------------------------|-----------|--------|
          Show actual task transitions
          
          ### 📊 **Multi-tasking Analysis**
          **If multi-tasking data exists:**
          - **Total Multi-task Time:** X hours
          - **Single-task Time:** Y hours
          - **Most Common Combinations:** [actual combinations]
          
          ### 🕐 **Peak Focus Hours**
          **Time-of-day analysis:**
          | Hour Range | Focus Sessions | Avg Duration | Best Tasks |
          |------------|----------------|--------------|------------|
          Based on actual session data
          
          ### 💡 **Focus Insights**
          **Data-driven observations:**
          - **Best Focus Day:** [day with longest sessions]
          - **Average Session Length:** [calculated from data]
          - **Most Productive Category:** [by focus time]
          
          ### 🎯 **Focus Optimization Recommendations**
          Based on your actual patterns:
          1. **Protect Peak Hours:** [specific times from data]
          2. **Batch Similar Tasks:** [categories that work well together]
          3. **Minimize Switches:** [specific problem areas]
          
          Use only real session data from the time tracking.`
        },

        technical: {
          system: `You are a technical work analyst focusing on development, debugging, and technical tasks. Use ONLY real data from time tracking. Never invent technical work that wasn't logged. Skip sections without relevant data.
          
          IMPORTANT:  Do not make any reference to deliverables, project, or task by the ID string, always  use the human redable names.Create a professional technical work report using rich markdown:
          - Organize by technical categories and projects
          - Use proper formatting for code-related items
          - Make it suitable for technical reviews or standups
          - Focus on actual technical work completed`,
          
          user: `Analyze my technical and development work from the time tracking data.
          
          **CREATE A TECHNICAL WORK REPORT** with professional formatting:
          
          ### 💻 **Development Work**
          **Technical tasks completed:**
          | Task | Project/Category | Time Spent | Status | Notes |
          |------|------------------|------------|--------|-------|
          List actual development tasks
          
          ### 🔧 **Technical Activities Breakdown**
          **Categorized technical work:**
          - **Coding/Development:** X hours
            - \`[Specific task 1]\`
            - \`[Specific task 2]\`
          - **Debugging/Testing:** Y hours
            - \`[Specific task]\`
          - **Documentation:** Z hours
            - \`[Specific task]\`
          - **Code Review:** W hours
            - \`[Specific task]\`
          
          ### 🐛 **Issues and Debugging**
          **If debugging tasks exist:**
          | Issue/Bug | Time Spent | Resolution | Category |
          |-----------|------------|------------|----------|
          From actual task descriptions
          
          ### 📚 **Technical Documentation**
          **Documentation work (if any):**
          - **Created:** [list from tasks]
          - **Updated:** [list from tasks]
          - **Time Investment:** X hours total
          
          ### 🔄 **Technical Projects**
          **Project-based view:**
          Project: [Name]
          ├── Development: X hours
          ├── Testing: Y hours
          └── Documentation: Z hours
          
          ### 📝 **Technical Notes**
          **From task notes (if any):**
          > **Challenge:** [exact quote]
          > **Solution:** [exact quote]
          > **Learning:** [exact quote]
          
          ### 📊 **Technical Metrics**
          - **Total Technical Time:** X hours
          - **Most Time:** [category/project]
          - **Completed Items:** [count]
          
          ### 🎯 **Technical Recommendations**
          Based on your work patterns:
          1. **Efficiency:** [specific suggestion from data]
          2. **Focus Area:** [where most time spent]
          3. **Optimization:** [specific improvement]
          
          Show only actual technical work from the data.`
        },

        patterns: {
          system: `You are a time pattern analyst who identifies work rhythms and habits. Use ONLY provided data to find actual patterns. Never invent patterns or examples. Skip any analysis where insufficient data exists.
          
          IMPORTANT:  Do not make any reference to deliverables, project, or task by the ID string, always  use the human redable names.Create a professional pattern analysis report using rich markdown:
          - Use data visualization techniques in formatting
          - Apply statistical analysis where possible
          - Make patterns clear and actionable
          - Professional presentation for optimization`,
          
          user: `Identify patterns in my work habits from the time tracking data.
          
          **CREATE A PATTERN ANALYSIS REPORT** with visual formatting:
          
          ### 📊 **Daily Time Patterns**
          **Work distribution by day:**
          | Day | Total Hours | Tasks | Top Category | Peak Hours |
          |-----|-------------|-------|--------------|------------|
          From actual daily data
          
          ### 🕐 **Hourly Distribution**
          **When work happens:**
          | Hour Range | Frequency | Typical Tasks | Avg Duration |
          |------------|-----------|---------------|--------------|
          | Morning (6-12) | X times | [categories] | Y mins |
          | Afternoon (12-18) | X times | [categories] | Y mins |
          | Evening (18-24) | X times | [categories] | Y mins |
          
          ### 🔄 **Recurring Activities**
          **Tasks that repeat:**
          | Task/Type | Frequency | Typical Duration | Category |
          |-----------|-----------|------------------|----------|
          Identify actual recurring patterns
          
          ### 📈 **Weekly Rhythm**
          **Week-over-week patterns:**
          - **Most Productive Day:** [day] with X hours
          - **Least Active Day:** [day] with Y hours
          - **Consistent Activities:** [tasks that appear weekly]
          
          ### 🎯 **Category Patterns**
          **How categories distribute:**
          | Category | Avg Daily Time | Peak Day | Peak Time | Typical Duration |
          |----------|----------------|----------|-----------|------------------|
          Based on actual category data
          
          ### 🔍 **Work Session Patterns**
          **Session characteristics:**
          - **Average Session Length:** X minutes
          - **Sessions per Day:** Y average
          - **Longest Sessions:** [category/type]
          - **Shortest Sessions:** [category/type]
          
          ### 💡 **Pattern Insights**
          **Observable trends from data:**
          - **Consistency:** [most consistent activities]
          - **Variability:** [most variable activities]
          - **Clustering:** [tasks that occur together]
          
          ### 🎯 **Optimization Opportunities**
          Based on identified patterns:
          1. **Leverage Peak Times:** [specific times from data]
          2. **Batch Similar Work:** [categories that cluster]
          3. **Routine Optimization:** [improve recurring tasks]
          
          Analyze only actual patterns present in the data.`
        }
      };
      //Templates
      this.builtinTemplateMeta = {
        productivity: { name: '📈 Productivity' },
        weekly:       { name: '🗓️ Weekly Review' },
        daily:        { name: '☀️ Daily Review' },
        team:         { name: '👥 Team' },
        client:       { name: '💼 Client' },
        executive:    { name: '🏛️ Executive' },
        focus:        { name: '🎯 Focus' },
        technical:    { name: '💻 Technical' },
        patterns:     { name: '📊 Patterns' }
      };
      
      // Keep existing constructor properties
      this.apiClient = null;
      this.settings = {
        mode: 'copy',
        provider: 'openai', 
        model: 'gpt-4o',
        template: 'productivity',
        dateRange: 'week',
        temperature: 0.7,
        maxTokens: 16000,
        includeMultitasking: true,
        includeDeliverables: true,
        includeMeetings: true,
        includeCategories: true,
        includeDailyPatterns: true,
        includeProductivity: true,
        includeCharts: true
      };
      this.mergedTemplates = null;
      this.currentReport = null;
      this.initialized = false;
      this._modelLoadReqId = 0;
    }

    // --- Custom templates: load + merge into this.templates ---
// Replace your current loadCustomTemplates() with this version
async loadCustomTemplates() {
  // Read ONLY template-specific keys (avoid generic "templates")
  const keys = ['customTemplates', 'aiReportCustomTemplates'];
  const stored = await new Promise(res => chrome.storage.local.get(keys, d => res(d || {})));

  // choose first non-empty value
  let raw = null;
  for (const k of keys) {
    const v = stored[k];
    if (Array.isArray(v) ? v.length : v && typeof v === 'object' && Object.keys(v).length) { raw = v; break; }
  }

  // Normalize customs to an array
  let customs = [];
  if (Array.isArray(raw)) {
    customs = raw;
  } else if (raw && typeof raw === 'object') {
    customs = Object.entries(raw).map(([key, t]) => ({
      _keyFromMap: key,
      id: t.id || key,
      name: t.name || t.title || key,
      description: t.description || '',
      system: t.system || '',
      user: t.user || t.prompt || '',
      version: t.version || 'custom',
      updatedAt: t.updatedAt || Date.now(),
    }));
  }

  // Build a NON-DESTRUCTIVE merged view (built-ins + customs)
  const merged = { ...this.templates }; // keep the originals intact
  customs.forEach(t => {
    const key =
      t._keyFromMap ||
      t.id ||
      (t.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
      `t_${Math.random().toString(36).slice(2,10)}`;
    merged[key] = {
      id: t.id || key,
      name: t.name || key,
      description: t.description || '',
      system: t.system || '',
      user: t.user || '',
      version: t.version || 'custom',
      updatedAt: t.updatedAt || Date.now(),
    };
  });

  this.mergedTemplates = merged;
  return customs;
}

// Helper to title-case a key if needed
titleCase(s='') { return s.replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/[-_]/g,' '); }

buildTemplateDropdown(selectEl) {
  if (!selectEl) return;

  const source = this.mergedTemplates || this.templates || {};
  selectEl.innerHTML = '';

  // Split built-ins vs customs
  const entries = Object.entries(source).map(([key, t]) => ({ key, ...t }));
  const builtins = entries.filter(e => (e.version === 'builtin' || !e.version));
  const customs  = entries.filter(e => e.version && e.version !== 'builtin')
                          .sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));

  const addOpt = (parent, e, isBuiltin) => {
    const opt = document.createElement('option');
    // Built-ins: use friendly name + icon from meta
    if (isBuiltin) {
      const meta = this.builtinTemplateMeta?.[e.key];
      const label = meta?.name || this.titleCase(e.name || e.key);
      opt.textContent = label;
    } else {
      // Customs: prefer explicit name; fallback to title-cased key
      const label = e.name || this.titleCase(e.key);
      // Optional: if custom object includes e.icon, prepend it
      opt.textContent = e.icon ? `${e.icon} ${label}` : label;
    }
    opt.value = e.key;
    parent.appendChild(opt);
  };

  if (builtins.length) {
    const g = document.createElement('optgroup'); g.label = 'Built-in';
    builtins.forEach(e => addOpt(g, e, true));
    selectEl.appendChild(g);
  }

  const g2 = document.createElement('optgroup'); g2.label = 'Custom';
  customs.forEach(e => addOpt(g2, e, false));
  selectEl.appendChild(g2);

  // Restore selection
  const wanted = this.settings.selectedTemplateId || this.settings.template;
  if (wanted && Array.from(selectEl.options).some(o => o.value === wanted)) {
    selectEl.value = wanted;
  } else if (builtins.length) {
    selectEl.value = builtins[0].key;
  }
}

// Handle saving of templates
handleSaveTemplate() {
  // Get current prompts from the UI
  const systemPrompt = document.getElementById('systemPrompt');
  const userPrompt = document.getElementById('userPrompt');
  
  if (!systemPrompt || !userPrompt) {
    this.showNotification('Error: Could not find prompt fields', 'error');
    return;
  }
  
  const system = systemPrompt.value.trim();
  const user = userPrompt.value.trim();
  
  if (!system || !user) {
    this.showNotification('Please enter both system and user prompts before saving', 'warning');
    return;
  }
  
  // Check if we're editing an existing template
  const templateSelect = document.getElementById('reportTemplate');
  let templateName = templateSelect?.value;
  
  // Only prompt for name if it's a new template (no template selected or default template)
  if (!templateName || templateName === 'default' || templateName === '') {
    templateName = prompt('Enter a name for this new template:');
    
    if (!templateName || !templateName.trim()) {
      return; // User cancelled or entered empty name
    }
    
    templateName = templateName.trim();
  }
  
  const name = templateName;
  
  // Load existing templates
  chrome.storage.local.get(['customTemplates'], (result) => {
    const templates = result.customTemplates || {};
    
    // Only confirm overwrite if it's a new name that already exists
    // (not when updating the currently selected template)
    if (templates[name] && templateSelect?.value !== name) {
      if (!confirm(`A template named "${name}" already exists. Do you want to replace it?`)) {
        return;
      }
    }
    
    // Save/update the template
    templates[name] = { system, user };
    
    chrome.storage.local.set({ customTemplates: templates }, () => {
      this.showNotification(`Template "${name}" saved successfully!`, 'success');
      
      // Reload templates to update dropdown
      this.loadCustomTemplates().then(() => {
        const templateSelect = document.getElementById('reportTemplate');
        if (templateSelect) {
          this.buildTemplateDropdown(templateSelect);
          // Keep the current template selected
          templateSelect.value = name;
          this.settings.template = name;
          this.settings.selectedTemplateId = name;
          this.saveSettings();
        }
      });
    });
  });
}
    // Initialize the AI Reports system
    async init() {
      try {
        // Check if Chart.js is loaded
        const ChartJS = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);
        if (!ChartJS) {
          console.warn('Chart.js not loaded - charts will be disabled. Make sure chart.min.js is included in popup.html');
          this.settings.includeCharts = false;
        } else {
          console.log('Chart.js loaded successfully');
        }
        
        // Check if API client is available
        if (typeof UnifiedAPIClient !== 'undefined') {
          try {
            this.apiClient = new UnifiedAPIClient();
            // Force load custom models on init
            await this.apiClient.loadCustomModels();
          } catch (apiError) {
            console.error('Error initializing API client:', apiError);
            this.apiClient = null;
          }
        } else {
          this.apiClient = null;
        }
        
        await this.loadSettings();              // existing
        await this.loadCustomTemplates();       // new (non-destructive)
        this.setupEventListeners();             // existing
        await this.initializeUI();              // existing (uses buildTemplateDropdown)
        this.loadTemplate(this.settings.selectedTemplateId || this.settings.template || 'productivity'); // existing
        

        // Check for API keys and set initial mode
        const hasAnyKey = await this.hasAnyApiKey();
        
        // Force copy mode if no keys available or no API client
        if (!hasAnyKey || !this.apiClient) {
          this.settings.mode = 'copy';
          await this.saveSettings();
        }
        
        // Setup UI event listeners
        this.setupEventListeners();
        
        // Initialize UI based on saved settings
        await this.initializeUI();
        
        // Load initial template
        this.loadTemplate(this.settings.template || 'productivity');
        
        this.initialized = true;
        return true;
      } catch (error) {
        console.error('Failed to initialize AI Report Generator:', error);
        return false;
      }
    }

    // Initialize UI state
    async initializeUI() {
      try {
        // Check API key status first
        const hasAnyKey = await this.checkApiKeyStatus();
        
        // Set radio buttons based on saved mode and key availability
        const copyRadio = document.querySelector('input[name="aiReportMode"][value="copy"]');
        const apiRadio = document.querySelector('input[name="aiReportMode"][value="api"]');
        
        // Force copy mode if no keys
        if (!hasAnyKey) {
          this.settings.mode = 'copy';
          if (copyRadio) copyRadio.checked = true;
          if (apiRadio) {
            apiRadio.checked = false;
            apiRadio.disabled = true;
            const apiLabel = apiRadio.parentElement;
            if (apiLabel) {
              apiLabel.style.opacity = '0.5';
              apiLabel.title = 'API keys required - Configure in Settings';
            }
          }
        } else {
          // Set radio based on saved settings
          if (this.settings.mode === 'api' && apiRadio) {
            apiRadio.checked = true;
            apiRadio.disabled = false;
            if (copyRadio) copyRadio.checked = false;
          } else if (copyRadio) {
            copyRadio.checked = true;
            if (apiRadio) apiRadio.checked = false;
          }
        }
        
        // Update UI to match the mode
        this.updateUIForMode(this.settings.mode);
        
        // Initialize provider dropdown
        const providerSelect = document.getElementById('llmProvider');
        if (providerSelect && this.settings.provider) {
          providerSelect.value = this.settings.provider;
        }
        
        // Initialize provider and model if in API mode
        if (this.settings.mode === 'api' && hasAnyKey && this.apiClient) {
          // Small delay to ensure DOM is ready
          setTimeout(async () => {
            await this.handleProviderChange(this.settings.provider || 'openai');
          }, 100);
        }
        
        // Set other UI elements
        const templateSelect = document.getElementById('reportTemplate');
        if (templateSelect) {
          // Build from merged templates
          this.buildTemplateDropdown(templateSelect);
        
          // Persist and load when user changes selection
          templateSelect.addEventListener('change', (e) => {
            const key = e.target.value;
            this.settings.selectedTemplateId = key;
            this.settings.template = key; // keep old field in sync
            this.saveSettings();
            this.loadTemplate(key); // will now work for custom entries too
          });
        }
        
        
        const dateRange = document.getElementById('aiReportDateRange');
        if (dateRange) {
          dateRange.value = this.settings.dateRange;
          this.handleDateRangeChange(this.settings.dateRange);
        }
        
        const tempSlider = document.getElementById('temperature');
        const tempValue = document.getElementById('temperatureValue');
        if (tempSlider) tempSlider.value = this.settings.temperature;
        if (tempValue) tempValue.textContent = this.settings.temperature;
        
        const maxTokens = document.getElementById('maxTokens');
        const maxTokensValue = document.getElementById('maxTokensValue');
        if (maxTokens) maxTokens.value = this.settings.maxTokens;
        if (maxTokensValue) maxTokensValue.textContent = this.settings.maxTokens;
        
      } catch (error) {
        console.error('Error initializing UI:', error);
      }
    }

    // Check if any API key is configured
    async hasAnyApiKey() {
      if (!this.apiClient) return false;
      
      const providers = ['openai', 'anthropic', 'google'];
      for (const provider of providers) {
        try {
          const hasKey = await this.apiClient.getApiKey(provider);
          if (hasKey) return true;
        } catch (error) {
          console.error(`Error checking ${provider} key:`, error);
        }
      }
      return false;
    }
  
    // Load settings from storage
    async loadSettings() {
      return new Promise((resolve) => {
        chrome.storage.local.get(['aiReportSettings'], (result) => {
          if (result.aiReportSettings) {
            Object.assign(this.settings, result.aiReportSettings);
          }
          resolve();
        });
      });
    }
  
    // Save settings to storage
    async saveSettings() {
      return new Promise((resolve) => {
        chrome.storage.local.set({ aiReportSettings: this.settings }, resolve);
      });
    }
  
    // Setup all event listeners
    setupEventListeners() {
      // Main button to open modal
      const aiReportBtn = document.getElementById('aiReportBtn');
      if (aiReportBtn) {
        aiReportBtn.addEventListener('click', () => this.openModal());
      }
      // Add Save Template button handler
      const saveTemplateBtn = document.getElementById('savePromptTemplate');
      if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', () => this.handleSaveTemplate());
      }
      // Modal close button
      const closeBtn = document.getElementById('closeAiReportsModal');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeModal());
      }
  
      // Report Viewer Modal close button
      const closeReportViewerBtn = document.getElementById('closeReportViewer');
      if (closeReportViewerBtn) {
        closeReportViewerBtn.addEventListener('click', () => this.closeReportViewer());
      }
  
      // Generate/Copy button
      const generateBtn = document.getElementById('generateReportBtn');
      if (generateBtn) {
        generateBtn.addEventListener('click', () => this.handleGenerate());
      }
  
      // Preview data button
      const previewBtn = document.getElementById('previewDataBtn');
      if (previewBtn) {
        previewBtn.addEventListener('click', () => this.previewData());
      }
      // Report template change NEW

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.customTemplates || changes.aiReportCustomTemplates) {
          (async () => {
            await this.loadCustomTemplates(); // non-destructive
            const el = document.getElementById('reportTemplate');
            if (el) this.buildTemplateDropdown(el);
          })();
        }
      });
      
      // Template selector
      const templateSelect = document.getElementById('reportTemplate');
      if (templateSelect) {
        templateSelect.addEventListener('change', (e) => this.loadTemplate(e.target.value));
      }
  
      // Mode selection (copy vs API)
      const modeRadios = document.getElementsByName('aiReportMode');
      modeRadios.forEach(radio => {
        radio.addEventListener('change', async (e) => {
          const newMode = e.target.value;
          
          // Check if API mode is allowed
          if (newMode === 'api') {
            const hasKey = await this.hasAnyApiKey();
            if (!hasKey) {
              // Revert to copy mode
              const copyRadio = document.querySelector('input[name="aiReportMode"][value="copy"]');
              if (copyRadio) copyRadio.checked = true;
              this.showNotification('Please configure API keys in Settings first', 'warning');
              return;
            }
          }
          
          this.settings.mode = newMode;
          this.updateUIForMode(newMode);
          this.saveSettings();
        });
      });
  
      // Provider selector
      const providerSelect = document.getElementById('llmProvider');
      if (providerSelect) {
        // Set initial value
        providerSelect.value = this.settings.provider || 'openai';
        
        providerSelect.addEventListener('change', async (e) => {
          this.settings.provider = e.target.value;
          await this.handleProviderChange(e.target.value);
          this.saveSettings();
        });
      }
  
      // Model selector
      const modelSelect = document.getElementById('llmModel');
      if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
          this.settings.model = e.target.value;
          this.saveSettings();
        });
      }
  
      // Date range selector
      const dateRange = document.getElementById('aiReportDateRange');
      if (dateRange) {
        dateRange.addEventListener('change', (e) => {
          this.settings.dateRange = e.target.value;
          this.handleDateRangeChange(e.target.value);
          this.saveSettings();
        });
      }
  
      // Temperature slider
      const tempSlider = document.getElementById('temperature');
      const tempValue = document.getElementById('temperatureValue');
      if (tempSlider && tempValue) {
        tempSlider.addEventListener('input', (e) => {
          tempValue.textContent = e.target.value;
          this.settings.temperature = parseFloat(e.target.value);
          this.saveSettings();
        });
      }
  
      // Max tokens slider
      const maxTokensSlider = document.getElementById('maxTokens');
      const maxTokensValue = document.getElementById('maxTokensValue');
      if (maxTokensSlider && maxTokensValue) {
        maxTokensSlider.addEventListener('input', (e) => {
          maxTokensValue.textContent = e.target.value;
          this.settings.maxTokens = parseInt(e.target.value);
          this.saveSettings();
        });
      }
  
      // Data options checkboxes
      this.setupDataOptionsListeners();
  
      // Preview modal controls
      this.setupPreviewModalControls();
    }
  
    // Setup data options listeners
    setupDataOptionsListeners() {
      const options = [
        'includeMultitasking',
        'includeDeliverables',
        'includeMeetings',
        'includeCategories',
        'includeDailyPatterns',
        'includeProductivity',
        'includeCharts'
      ];
  
      options.forEach(option => {
        const checkbox = document.getElementById(option);
        if (checkbox) {
          // Set initial state from settings
          checkbox.checked = this.settings[option] !== false; // Default to true
          checkbox.addEventListener('change', (e) => {
            this.settings[option] = e.target.checked;
            this.saveSettings();
            
            // Log chart state changes for debugging
            if (option === 'includeCharts') {
              console.log('Charts enabled:', e.target.checked);
            }
          });
        }
      });
    }
  
    // Setup preview modal controls
    setupPreviewModalControls() {
      const closePreviewBtn = document.getElementById('closeDataPreviewModal');
      if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', () => {
          const modal = document.getElementById('dataPreviewModal');
          if (modal) modal.style.display = 'none';
        });
      }
  
      const closePreviewBtn2 = document.getElementById('closePreviewBtn');
      if (closePreviewBtn2) {
        closePreviewBtn2.addEventListener('click', () => {
          const modal = document.getElementById('dataPreviewModal');
          if (modal) modal.style.display = 'none';
        });
      }
  
      const copyDataBtn = document.getElementById('copyDataOnly');
      if (copyDataBtn) {
        copyDataBtn.addEventListener('click', () => this.copyDataOnly());
      }
    }
  
    // Open modal
    async openModal() {
      const modal = document.getElementById('aiReportsModal');
      if (modal) {
        // Re-initialize UI state when opening modal
        if (!this.initialized) {
          await this.init();
        } else {
          await this.initializeUI();
        }
        modal.style.display = 'flex';
        
        // Only inspect storage if debug mode is enabled (check console for debug)
        if (window.debugAIReports) {
          console.log('Debug mode enabled, inspecting storage...');
          this.inspectStorage().catch(console.error);
        }
      }
    }
  
    // Close modal
    closeModal() {
      const modal = document.getElementById('aiReportsModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }
  
    // Close Report Viewer Modal
    closeReportViewer() {
      const modal = document.getElementById('reportViewerModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }
  
    // Update UI based on mode (copy vs API)
    updateUIForMode(mode) {
      const apiSettings = document.getElementById('apiSettings');
      const copySettings = document.getElementById('copySettings');
      const generateBtn = document.getElementById('generateReportBtn');
  
      // If API client is not available, force copy mode
      if (!this.apiClient && mode === 'api') {
        console.warn('API client not available, forcing copy mode');
        mode = 'copy';
        this.settings.mode = 'copy';
        
        // Update radio buttons
        const copyRadio = document.querySelector('input[name="aiReportMode"][value="copy"]');
        if (copyRadio) copyRadio.checked = true;
        const apiRadio = document.querySelector('input[name="aiReportMode"][value="api"]');
        if (apiRadio) apiRadio.checked = false;
      }
  
      if (mode === 'api' && this.apiClient) {
        // API mode
        if (apiSettings) apiSettings.style.display = 'block';
        if (copySettings) copySettings.style.display = 'none';
        if (generateBtn) {
          generateBtn.textContent = '🚀 Generate Report with AI';
        }
        this.checkApiKeyStatus();
      } else {
        // Copy mode
        if (apiSettings) apiSettings.style.display = 'none';
        if (copySettings) copySettings.style.display = 'block';
        if (generateBtn) {
          generateBtn.textContent = '📋 Copy Prompt & Data';
        }
      }
    }
  
    // Handle provider change
    async handleProviderChange(provider) {
      if (!this.apiClient) {
        console.error('API client not available');
        return;
      }
    
      const modelSelect = document.getElementById('llmModel');
      if (!modelSelect) {
        console.error('Model select element not found');
        return;
      }
    
      // Tag this request so older responses can't clobber the UI
      const reqId = ++this._modelLoadReqId;
    
      // Keep a snapshot to restore if an error happens
      const prevHTML = modelSelect.innerHTML;
      const prevDisabled = modelSelect.disabled;
    
      // Show a loading hint (but we’ll fully rebuild only when we have data)
      modelSelect.disabled = true;
      modelSelect.innerHTML = '<option value="">Loading models...</option>';
    
      try {
        // Load custom models (no-ops if already loaded)
        await this.apiClient.loadCustomModels();
    
        // Fetch models for this provider
        const models = await this.apiClient.getAllModels(provider);
    
        // If a newer request started meanwhile, abort updating the UI
        if (reqId !== this._modelLoadReqId) return;
    
        if (!models || models.length === 0) {
          modelSelect.innerHTML = '<option value="">No models available</option>';
          modelSelect.disabled = false;
          return;
        }
    
        // Preserve previous selection when possible
        const previousValue = this.settings.model || modelSelect.value;
    
        modelSelect.innerHTML = models.map(m => {
          const label = `${m.name}${m.isCustom ? ' (Custom)' : ''}`;
          return `<option value="${m.id}">${label}</option>`;
        }).join('');
    
        // Choose: previously selected → default → first
        const prev = models.find(m => m.id === previousValue);
        const def  = models.find(m => m.default) || models[0];
        const chosen = (prev || def).id;
    
        modelSelect.value = chosen;
        this.settings.model = chosen;
    
        // Key reminder if needed (non-blocking)
        const hasKey = await this.apiClient.getApiKey(provider);
        if (!hasKey && this.settings.mode === 'api') {
          this.showNotification(`⚠️ Please add your ${provider} API key in settings`, 'warning');
        }
      } catch (err) {
        console.error('Error updating models:', err);
    
        // Only restore if this is still the latest request
        if (reqId === this._modelLoadReqId) {
          modelSelect.innerHTML = prevHTML || '<option value="">Error loading models</option>';
          modelSelect.disabled = prevDisabled ?? false;
        }
        this.showNotification('Error loading models. Please try again.', 'error');
      } finally {
        if (reqId === this._modelLoadReqId) {
          modelSelect.disabled = false;
        }
      }
    }
    
  
    // Check API key status
    async checkApiKeyStatus() {
      if (!this.apiClient) return false;
    
      const providers = ['openai', 'anthropic', 'google'];
      let hasAnyKey = false;
    
      for (const provider of providers) {
        try {
          const hasKey = await this.apiClient.getApiKey(provider);
          if (hasKey) hasAnyKey = true;
    
          const indicators = [
            document.getElementById(`${provider}KeyStatus`),
            document.getElementById(`${provider}KeyIndicator`)
          ];
          indicators.forEach(indicator => {
            if (!indicator) return;
            indicator.textContent = hasKey ? '✔' : '✗';
            indicator.className = hasKey ? 'key-status configured' : 'key-status missing';
            indicator.style.color = hasKey ? 'green' : 'red';
          });
        } catch (error) {
          console.error(`Error checking ${provider} key:`, error);
        }
      }
    
      const apiRadio = document.querySelector('input[name="aiReportMode"][value="api"]');
      if (apiRadio) {
        apiRadio.disabled = !hasAnyKey;
        const apiLabel = apiRadio.parentElement;
        if (apiLabel) {
          apiLabel.style.opacity = hasAnyKey ? '1' : '0.5';
          apiLabel.title = hasAnyKey ? 'Generate report using API' : 'API keys required - Configure in Settings';
        }
    
        // If user had API mode selected but there are no keys, force copy mode.
        if (!hasAnyKey && this.settings.mode === 'api') {
          const copyRadio = document.querySelector('input[name="aiReportMode"][value="copy"]');
          if (copyRadio) copyRadio.checked = true;
          this.settings.mode = 'copy';
          this.updateUIForMode('copy'); // UI only; does NOT call handleProviderChange
        }
      }
    
      return hasAnyKey;
    }
    
    // Load template
    loadTemplate(templateIdOrKey) {
      const source = this.mergedTemplates || this.templates || {};
      const template = source[templateIdOrKey] || source[this.settings.template] || source.productivity;
      if (!template) return;
    
      const systemPrompt = document.getElementById('systemPrompt');
      const userPrompt   = document.getElementById('userPrompt');
    
      if (systemPrompt) systemPrompt.value = template.system || '';
      if (userPrompt)   userPrompt.value   = template.user   || '';
    
      this.settings.selectedTemplateId = templateIdOrKey;
      this.settings.template = templateIdOrKey;
      this.saveSettings();
    }
    
    // Handle date range change
    handleDateRangeChange(value) {
      const customRange = document.getElementById('aiCustomDateRange');
      if (!customRange) return;
  
      if (value === 'custom') {
        customRange.style.display = 'flex';
      } else {
        customRange.style.display = 'none';
      }
    }
  
    // Handle generate button click
    async handleGenerate() {
      if (this.settings.mode === 'api' && this.apiClient) {
        await this.generateWithAPI();
      } else {
        await this.copyPromptAndData();
      }
    }
      
    // Gather data for report - with improved error handling
    async gatherData() {
      // Directly fall back to storage - message passing seems unreliable
      const data = await this.gatherDataFromStorage();
      
      // Add flag for charts
      data.includeCharts = this.settings.includeCharts;
      
      // Add allocation summary if there are any allocated entries
      if (data.entries) {
        const allocatedEntries = data.entries.filter(e => e.isAllocated);
        if (allocatedEntries.length > 0) {
          data.allocationSummary = {
            totalAllocatedEntries: allocatedEntries.length,
            totalAllocatedHours: allocatedEntries.reduce((sum, e) => sum + (e.duration / 3600000), 0).toFixed(2),
            meetingsWithAllocations: [...new Set(allocatedEntries.map(e => (e.description || '').replace(/ \[\d+% allocated\]/, '')))].length
          };
        }
      }
      
      return data;
    }

    // Fallback method to gather data from storage
    async gatherDataFromStorage() {
      return new Promise((resolve) => {
        chrome.storage.local.get(['timeEntries', 'categories', 'goals', 'deliverables'], (result) => {
          // Debug logging
          console.log('Storage fetch result:', {
            hasTimeEntries: !!result.timeEntries,
            hasCategories: !!result.categories,
            hasGoals: !!result.goals,
            hasDeliverables: !!result.deliverables,
            deliverablesCount: result.deliverables ? result.deliverables.length : 0,
            deliverablesSample: result.deliverables ? result.deliverables.slice(0, 2) : null
          });
          
          const dateRange = this.getDateRange();
          // timeEntries is an object with dates as keys
          const timeEntriesObj = result.timeEntries || {};
          let entries = [];
          
          // Extract all entries from the date-keyed object
          Object.keys(timeEntriesObj).forEach(dateKey => {
            const dayEntries = timeEntriesObj[dateKey];
            if (Array.isArray(dayEntries)) {
              dayEntries.forEach(entry => {
                // Skip scheduled entries that weren't tracked
                if (!entry.scheduled && !entry.fromCalendar) {
                  // Ensure entry has proper date/time fields
                  if (!entry.date) {
                    entry.date = dateKey;
                  }
                  
                  // Ensure startTime is valid
                  if (!entry.startTime && entry.date) {
                    // Try to reconstruct from date if missing
                    entry.startTime = new Date(entry.date).toISOString();
                  }
                  
                  entries.push(entry);
                }
              });
            }
          });
          
          // Now filter by date range
          const filteredEntries = entries.filter(entry => {
            if (!entry.startTime) return false;
            const entryDate = new Date(entry.startTime);
            return entryDate >= dateRange.start && entryDate <= dateRange.end;
          });
          
          // Process categories
          const categories = Array.isArray(result.categories) ? result.categories : [
            'Email', 'Meeting', 'Project Work', 'Admin', 
            'Break', 'Training', 'Planning', 'Other'
          ];
          
          const goals = result.goals || [];
          const deliverables = result.deliverables || [];
                    
          // Process entries to handle allocations before building data
          const processedEntries = [];
          filteredEntries.forEach(entry => {
            if (entry.deliverableAllocations) {
              // Split allocated meetings into virtual entries for analysis
              Object.entries(entry.deliverableAllocations).forEach(([delivId, percentage]) => {
                processedEntries.push({
                  ...entry,
                  deliverableId: delivId,
                  duration: entry.duration * percentage / 100,
                  description: entry.description + ` [${percentage}% allocated]`,
                  isAllocated: true,
                  allocationPercentage: percentage,
                  originalDuration: entry.duration
                });
              });
            } else {
              processedEntries.push(entry);
            }
          });

          // Build the data object with processed entries
          const data = {
            dateRange: {
              start: dateRange.start.toISOString(),
              end: dateRange.end.toISOString()
            },
            summary: this.calculateSummary(processedEntries),
            entries: processedEntries
          };

          if (this.settings.includeCategories) {
            data.categoryBreakdown = this.calculateCategoryBreakdown(processedEntries, categories);
          }

          // Add deliverable breakdown
          if (result.deliverables) {
            data.deliverableBreakdown = this.calculateDeliverableBreakdown(processedEntries, result.deliverables);
          }
          
          if (this.settings.includeDailyPatterns) {
            data.dailyPatterns = this.calculateDailyPatterns(filteredEntries);
          }
          
          if (this.settings.includeProductivity) {
            data.productivityMetrics = this.calculateProductivityMetrics(filteredEntries);
          }
          
          if (this.settings.includeMeetings) {
            data.meetings = this.extractMeetings(filteredEntries);
          }
          
          if (goals) {
            data.goals = goals;
          }
          
          // Include deliverables list even if no time tracked
          if (result.deliverables) {
            data.deliverables = result.deliverables;
          }
          
          // Debug logging
          console.log('Data gathering complete:', {
            totalEntriesInStorage: Object.keys(timeEntriesObj).length,
            extractedEntries: entries.length,
            filteredEntries: filteredEntries.length,
            dateRange: data.dateRange,
            deliverables: result.deliverables ? result.deliverables.length : 0,
            deliverableBreakdown: data.deliverableBreakdown ? Object.keys(data.deliverableBreakdown).length : 0
          });
                    
          // Additional debug for deliverables
          console.log('Deliverable data:', {
            deliverables: result.deliverables,
            breakdown: data.deliverableBreakdown
          });
          resolve(data);
        });
      });
    }

    // Get date range based on settings
    getDateRange() {
        const now = new Date();
        let start, end;
      
        switch (this.settings.dateRange) {
          case 'today':
            start = new Date(now);
            start.setHours(0, 0, 0, 0);
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
            break;
            
          case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            start = new Date(yesterday);
            start.setHours(0, 0, 0, 0);
            end = new Date(yesterday);
            end.setHours(23, 59, 59, 999);
            break;
            
          case 'week':
            // This week (Sunday to today)
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            start = new Date(weekStart);
            start.setHours(0, 0, 0, 0);
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
            break;
            
          case 'lastweek':
            // Last week (previous Sunday to Saturday)
            const lastWeekStart = new Date(now);
            lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
            lastWeekStart.setHours(0, 0, 0, 0);
            start = new Date(lastWeekStart);
            
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
            lastWeekEnd.setHours(23, 59, 59, 999);
            end = lastWeekEnd;
            break;
            
          case 'month':
            // This month
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
            break;
            
          case 'lastmonth':
            // Last month
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            end.setHours(23, 59, 59, 999);
            break;
            
          case 'all':
            // All time
            start = new Date(2000, 0, 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
            break;
            
          case 'custom':
            const customStart = document.getElementById('customStartDate')?.value;
            const customEnd = document.getElementById('customEndDate')?.value;
            start = customStart ? new Date(customStart) : new Date(now);
            end = customEnd ? new Date(customEnd) : new Date(now);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
            
          default:
            // Default to this week if unknown value
            console.warn(`Unknown date range: ${this.settings.dateRange}, defaulting to this week`);
            const defaultWeekStart = new Date(now);
            defaultWeekStart.setDate(now.getDate() - now.getDay());
            start = new Date(defaultWeekStart);
            start.setHours(0, 0, 0, 0);
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
            break;
        }
      
        // Log for debugging
        console.log('Date range calculation:', {
          setting: this.settings.dateRange,
          start: start.toLocaleDateString(),
          end: end.toLocaleDateString(),
          startDay: start.toLocaleDateString('en-US', { weekday: 'long' }),
          endDay: end.toLocaleDateString('en-US', { weekday: 'long' })
        });
      
        return { start, end };
      }
  
    // Calculate summary statistics
    calculateSummary(entries) {
      // Ensure entries is an array
      if (!Array.isArray(entries)) {
        console.warn('calculateSummary: entries is not an array', entries);
        return {
          totalHours: 0,
          totalEntries: 0,
          uniqueTasks: 0,
          uniqueCategories: 0,
          averageSessionLength: 0
        };
      }
      
      const totalMs = entries.reduce((sum, entry) => {
        // Convert ISO strings to timestamps if needed
        let duration = 0;
        if (entry.duration) {
          // Use existing duration if available
          duration = typeof entry.duration === 'number' ? entry.duration : 0;
        } else if (entry.endTime && entry.startTime) {
          // Calculate from start/end times
          const start = new Date(entry.startTime).getTime();
          const end = new Date(entry.endTime).getTime();
          duration = end - start;
        }
        return sum + duration;
      }, 0);
  
      const uniqueTasks = new Set(entries.map(e => e.title || e.description || e.category || 'Untitled')).size;
      const uniqueCategories = new Set(entries.map(e => e.category).filter(c => c)).size;
  
      return {
        totalHours: Math.round(totalMs / 3600000 * 100) / 100,
        totalEntries: entries.length,
        uniqueTasks,
        uniqueCategories,
        averageSessionLength: entries.length > 0 ? Math.round(totalMs / entries.length / 60000) : 0
      };
    }
  
      // Calculate deliverable breakdown with allocation support
      calculateDeliverableBreakdown(entries, deliverables) {
        if (!Array.isArray(entries) || !Array.isArray(deliverables)) {
          console.warn('calculateDeliverableBreakdown: invalid input', { entries, deliverables });
          return {};
        }
        
        const breakdown = {};
        const deliverableMap = {};
        
        // Create map for quick lookup
        deliverables.forEach(d => {
          deliverableMap[d.id] = d;
          breakdown[d.id] = {
            name: d.name,
            goalId: d.goalId,
            status: d.completed ? 'Completed' : 'Active',
            totalHours: 0,
            totalMinutes: 0,  // Add total minutes
            allocatedHours: 0,  // Time from allocated meetings
            directHours: 0,     // Time directly assigned
            entries: 0,
            allocatedEntries: 0,
            tasks: new Set(),
            meetings: [],
            categories: {},  // Track time by category
            entryDetails: []  // Store individual entry details
          };
        });
        
        entries.forEach(entry => {
          if (!entry.deliverableId) return;
          
          const deliverable = breakdown[entry.deliverableId];
          if (!deliverable) return;
          
          // Calculate duration
          let duration = 0;
          if (entry.duration && typeof entry.duration === 'number') {
            duration = entry.duration / 3600000; // Convert ms to hours
          } else if (entry.endTime && entry.startTime) {
            const start = new Date(entry.startTime).getTime();
            const end = new Date(entry.endTime).getTime();
            duration = (end - start) / 3600000;
          }
          
          deliverable.totalHours += duration;
          deliverable.totalMinutes += (duration * 60); // Track minutes
          deliverable.entries++;
          
          // Track category breakdown
          const category = entry.category || 'Uncategorized';
          if (!deliverable.categories[category]) {
            deliverable.categories[category] = {
              hours: 0,
              minutes: 0,
              entries: 0,
              tasks: new Set()
            };
          }
          deliverable.categories[category].hours += duration;
          deliverable.categories[category].minutes += (duration * 60);
          deliverable.categories[category].entries++;
          deliverable.categories[category].tasks.add(entry.description || 'Untitled');
          
          // Store entry details
          deliverable.entryDetails.push({
            date: new Date(entry.startTime).toLocaleDateString(),
            category: category,
            description: entry.description || 'Untitled',
            duration: duration,
            minutes: Math.round(duration * 60),
            isAllocated: entry.isAllocated || false,
            allocationPercentage: entry.allocationPercentage || null
          });
          
          // Track if this is allocated time
          if (entry.isAllocated) {
            deliverable.allocatedHours += duration;
            deliverable.allocatedEntries++;
            
            // Track meeting info
            if (entry.type === 'meeting' || entry.category === 'Meeting') {
              deliverable.meetings.push({
                description: entry.description,
                duration: duration,
                percentage: entry.allocationPercentage || 100
              });
            }
          } else {
            deliverable.directHours += duration;
          }
          
          // Add task description
          deliverable.tasks.add(entry.description || 'Untitled');
        });
        
          // Convert sets to arrays and round numbers
          Object.keys(breakdown).forEach(key => {
            const d = breakdown[key];
            d.totalHours = Math.round(d.totalHours * 100) / 100;
            d.totalMinutes = Math.round(d.totalMinutes);
            d.allocatedHours = Math.round(d.allocatedHours * 100) / 100;
            d.directHours = Math.round(d.directHours * 100) / 100;
            d.uniqueTasks = d.tasks.size;
            d.taskList = Array.from(d.tasks);
            delete d.tasks;
            
            // Process category data
            Object.keys(d.categories).forEach(cat => {
              d.categories[cat].hours = Math.round(d.categories[cat].hours * 100) / 100;
              d.categories[cat].minutes = Math.round(d.categories[cat].minutes);
              d.categories[cat].taskList = Array.from(d.categories[cat].tasks);
              delete d.categories[cat].tasks;
            });
            
            // Remove empty deliverables
            if (d.entries === 0) {
              delete breakdown[key];
            }
          });
        
        return breakdown;
      }

      // Calculate category breakdown
      calculateCategoryBreakdown(entries, categories) {
      // Ensure entries is an array
      if (!Array.isArray(entries)) {
        console.warn('calculateCategoryBreakdown: entries is not an array', entries);
        return {};
      }
      
      const breakdown = {};
  
      entries.forEach(entry => {
        const category = entry.category || 'Uncategorized';
        if (!breakdown[category]) {
          breakdown[category] = {
            totalHours: 0,
            entries: 0,
            tasks: new Set()
          };
        }
  
        // Calculate duration properly
        let duration = 0;
        if (entry.duration && typeof entry.duration === 'number') {
          duration = entry.duration / 3600000; // Convert ms to hours
        } else if (entry.endTime && entry.startTime) {
          const start = new Date(entry.startTime).getTime();
          const end = new Date(entry.endTime).getTime();
          duration = (end - start) / 3600000; // Convert ms to hours
        }
        
        breakdown[category].totalHours += duration;
        breakdown[category].entries++;
        breakdown[category].tasks.add(entry.title || entry.description || 'Untitled');
      });
  
      // Convert sets to counts
      Object.keys(breakdown).forEach(key => {
        breakdown[key].totalHours = Math.round(breakdown[key].totalHours * 100) / 100;
        breakdown[key].uniqueTasks = breakdown[key].tasks.size;
        delete breakdown[key].tasks;
      });
  
      return breakdown;
    }
  
    // Calculate daily patterns
    calculateDailyPatterns(entries) {
      // Ensure entries is an array
      if (!Array.isArray(entries)) {
        console.warn('calculateDailyPatterns: entries is not an array', entries);
        return {};
      }
      
      const patterns = {};
  
      entries.forEach(entry => {
        const date = new Date(entry.startTime).toLocaleDateString();
        if (!patterns[date]) {
          patterns[date] = {
            totalHours: 0,
            entries: 0,
            categories: new Set()
          };
        }
  
        // Calculate duration properly
        let duration = 0;
        if (entry.duration && typeof entry.duration === 'number') {
          duration = entry.duration / 3600000; // Convert ms to hours
        } else if (entry.endTime && entry.startTime) {
          const start = new Date(entry.startTime).getTime();
          const end = new Date(entry.endTime).getTime();
          duration = (end - start) / 3600000; // Convert ms to hours
        }
        
        patterns[date].totalHours += duration;
        patterns[date].entries++;
        if (entry.category) patterns[date].categories.add(entry.category);
      });
  
      // Convert sets to counts
      Object.keys(patterns).forEach(key => {
        patterns[key].totalHours = Math.round(patterns[key].totalHours * 100) / 100;
        patterns[key].uniqueCategories = patterns[key].categories.size;
        delete patterns[key].categories;
      });
  
      return patterns;
    }
  
    // Calculate productivity metrics
    calculateProductivityMetrics(entries) {
      // Ensure entries is an array
      if (!Array.isArray(entries)) {
        console.warn('calculateProductivityMetrics: entries is not an array', entries);
        return {
          hourlyDistribution: [],
          focusTime: 0,
          breakTime: 0,
          longestSession: 0,
          averageSessionsPerDay: 0
        };
      }
      
      const hourlyDistribution = {};
      let totalFocusTime = 0;
      let totalBreakTime = 0;
      let longestSession = 0;
  
      entries.forEach(entry => {
        const hour = new Date(entry.startTime).getHours();
        
        // Calculate duration properly
        let duration = 0;
        if (entry.duration && typeof entry.duration === 'number') {
          duration = entry.duration;
        } else if (entry.endTime && entry.startTime) {
          const start = new Date(entry.startTime).getTime();
          const end = new Date(entry.endTime).getTime();
          duration = end - start;
        }
  
        if (!hourlyDistribution[hour]) {
          hourlyDistribution[hour] = 0;
        }
        hourlyDistribution[hour] += duration / 3600000; // Convert to hours
  
        // Consider sessions > 25 minutes as focus time
        if (duration > 25 * 60 * 1000) {
          totalFocusTime += duration;
        } else {
          totalBreakTime += duration;
        }
  
        if (duration > longestSession) {
          longestSession = duration;
        }
      });
  
      return {
        hourlyDistribution: Object.entries(hourlyDistribution).map(([hour, time]) => ({
          hour: parseInt(hour),
          hours: Math.round(time * 100) / 100
        })),
        focusTime: Math.round(totalFocusTime / 3600000 * 100) / 100,
        breakTime: Math.round(totalBreakTime / 3600000 * 100) / 100,
        longestSession: Math.round(longestSession / 60000),
        averageSessionsPerDay: entries.length / Math.max(1, this.getUniqueDays(entries))
      };
    }
  
    // Extract meetings from entries
    extractMeetings(entries) {
      // Ensure entries is an array
      if (!Array.isArray(entries)) {
        console.warn('extractMeetings: entries is not an array', entries);
        return {
          count: 0,
          totalHours: 0,
          list: []
        };
      }
      
      const meetingKeywords = ['meeting', 'call', 'standup', 'sync', 'review', '1:1', 'interview'];
      
      const meetings = entries.filter(entry => {
        const title = (entry.title || entry.name || entry.task || entry.description || '').toLowerCase();
        const category = (entry.category || '').toLowerCase();
        return (title && meetingKeywords.some(keyword => title.includes(keyword))) || 
               category === 'meeting';
      });
  
      return {
        count: meetings.length,
        totalHours: Math.round(meetings.reduce((sum, m) => {
          // Calculate duration properly
          let duration = 0;
          if (m.duration && typeof m.duration === 'number') {
            duration = m.duration / 3600000; // Convert ms to hours
          } else if (m.endTime && m.startTime) {
            const start = new Date(m.startTime).getTime();
            const end = new Date(m.endTime).getTime();
            duration = (end - start) / 3600000; // Convert ms to hours
          }
          return sum + duration;
        }, 0) * 100) / 100,
        list: meetings.map(m => {
          let duration = 0;
          if (m.duration && typeof m.duration === 'number') {
            duration = Math.round(m.duration / 60000); // Convert ms to minutes
          } else if (m.endTime && m.startTime) {
            const start = new Date(m.startTime).getTime();
            const end = new Date(m.endTime).getTime();
            duration = Math.round((end - start) / 60000); // Convert ms to minutes
          }
          
          return {
            title: m.title || m.name || m.task || m.description || 'Untitled Meeting',
            duration: duration,
            date: new Date(m.startTime).toLocaleDateString()
          };
        })
      };
    }
  
    // Get unique days count
    getUniqueDays(entries) {
      // Ensure entries is an array
      if (!Array.isArray(entries)) {
        console.warn('getUniqueDays: entries is not an array', entries);
        return 0;
      }
      
      const days = new Set();
      entries.forEach(entry => {
        if (entry && entry.startTime) {
          days.add(new Date(entry.startTime).toDateString());
        }
      });
      return days.size;
    }
  
    // Debug method to inspect storage
    async inspectStorage() {
      return new Promise((resolve) => {
        chrome.storage.local.get(null, (allData) => {
          console.log('=== Storage Inspection ===');
          console.log('All keys:', Object.keys(allData));
          
          // Check for time-related keys
          const timeKeys = Object.keys(allData).filter(key => 
            key.toLowerCase().includes('time') || 
            key.toLowerCase().includes('entry') || 
            key.toLowerCase().includes('task') ||
            key.toLowerCase().includes('track')
          );
          
          console.log('Time-related keys found:', timeKeys);
          
          timeKeys.forEach(key => {
            const value = allData[key];
            console.log(`Key: ${key}`);
            console.log(`  Type: ${typeof value}`);
            console.log(`  Is Array: ${Array.isArray(value)}`);
            if (typeof value === 'object' && value !== null) {
              console.log(`  Keys: ${Object.keys(value).slice(0, 5).join(', ')}...`);
              console.log(`  Sample:`, value);
            }
          });
          
          resolve(allData);
        });
      });
    }
    
    // Copy prompt and data to clipboard
    async copyPromptAndData() {
      try {
        this.showLoading(true);
        
        const data = await this.gatherData();
        
        // Add chart data if enabled
        if (this.settings.includeCharts) {
          data.chartData = this.generateChartData(data);
        }
        
        const systemPrompt = document.getElementById('systemPrompt')?.value || '';
        const userPrompt = document.getElementById('userPrompt')?.value || '';
        
        // Add instructions about charts if they're included
        let chartInstructions = '';
        if (this.settings.includeCharts && data.chartData) {
          chartInstructions = '\n\nNote: Chart data is included. Please create visualizations for:\n';
          if (data.chartData.dailyHours) chartInstructions += '- Daily time distribution bar chart\n';
          if (data.chartData.categoryPie) chartInstructions += '- Category breakdown pie chart\n';
          if (data.chartData.hourlyDistribution) chartInstructions += '- Hourly activity pattern line chart\n';
          if (data.chartData.focusBreakdown) chartInstructions += '- Focus vs short sessions doughnut chart\n';
        }
        
        const fullPrompt = `SYSTEM PROMPT:\n${systemPrompt}\n\nUSER PROMPT:\n${userPrompt}${chartInstructions}\n\nDATA:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
        
        await navigator.clipboard.writeText(fullPrompt);
        
        this.showNotification('✅ Prompt and data copied to clipboard! Paste into your preferred AI assistant.', 'success');
        this.showLoading(false);
        
      } catch (error) {
        console.error('Error copying prompt:', error);
        this.showNotification('❌ Failed to copy. Please try again.', 'error');
        this.showLoading(false);
      }
    }

    // Helper method to sanitize chart values
    sanitizeChartValue(value) {
      // Convert various input types to valid numbers
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number') return isFinite(value) ? value : 0;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isFinite(parsed) ? parsed : 0;
      }
      if (value && typeof value === 'object') {
        // Handle objects with value property (some chart libraries use this)
        if ('value' in value) return this.sanitizeChartValue(value.value);
        if ('y' in value) return this.sanitizeChartValue(value.y);
      }
      return 0;
    }
  
    // Generate chart data from gathered data
    generateChartData(data) {
      const chartData = {};
      
      // Daily hours chart
      if (data.dailyPatterns && Object.keys(data.dailyPatterns).length > 0) {
        const dates = Object.keys(data.dailyPatterns).sort();
        chartData.dailyHours = {
          type: 'bar',
          data: {
            labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })),
            datasets: [{
              label: 'Hours per Day',
              data: dates.map(d => this.sanitizeChartValue(data.dailyPatterns[d].totalHours)),
              backgroundColor: 'rgba(102, 126, 234, 0.8)',
              borderColor: 'rgba(102, 126, 234, 1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: 'Daily Time Distribution'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Hours'
                }
              }
            }
          }
        };
      }
      
      // Category breakdown pie chart
      if (data.categoryBreakdown && Object.keys(data.categoryBreakdown).length > 0) {
        const categories = Object.keys(data.categoryBreakdown);
        const categoryData = categories.map(cat => 
          this.sanitizeChartValue(data.categoryBreakdown[cat].totalHours || 0)
        );
        
        // Only create pie chart if we have categories (even if all zeros)
        if (categories.length > 0) {
          const colors = [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(244, 144, 128, 0.8)',
            'rgba(87, 155, 252, 0.8)',
            'rgba(255, 178, 102, 0.8)',
            'rgba(168, 198, 134, 0.8)',
            'rgba(232, 121, 249, 0.8)',
            'rgba(255, 138, 101, 0.8)'
          ];
          
          chartData.categoryPie = {
            type: 'pie',
            data: {
              labels: categories,
              datasets: [{
                data: categoryData,
                backgroundColor: colors.slice(0, categories.length),
                borderColor: colors.slice(0, categories.length).map(c => c.replace('0.8', '1')),
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right'
                },
                title: {
                  display: true,
                  text: 'Time by Category'
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                      return `${label}: ${value.toFixed(1)}h (${percentage}%)`;
                    }
                  }
                }
              }
            }
          };
        }
      }
      
      // Hourly distribution chart
      if (data.productivityMetrics && data.productivityMetrics.hourlyDistribution && data.productivityMetrics.hourlyDistribution.length > 0) {
        const hours = Array.from({length: 24}, (_, i) => i);
        const distribution = data.productivityMetrics.hourlyDistribution;
        const hourData = hours.map(h => {
          const found = distribution.find(d => d.hour === h);
          return found ? this.sanitizeChartValue(found.hours) : 0;
        });
        
        chartData.hourlyDistribution = {
          type: 'line',
          data: {
            labels: hours.map(h => `${h}:00`),
            datasets: [{
              label: 'Hours Worked',
              data: hourData,
              backgroundColor: 'rgba(102, 126, 234, 0.2)',
              borderColor: 'rgba(102, 126, 234, 1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: 'Hourly Activity Pattern'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Hours'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Hour of Day'
                }
              }
            }
          }
        };
      }
      
      // Focus vs Break time chart
      if (data.productivityMetrics) {
        const focusTime = this.sanitizeChartValue(data.productivityMetrics.focusTime || 0);
        const breakTime = this.sanitizeChartValue(data.productivityMetrics.breakTime || 0);
        
        // Only create chart if we have any time data
        if (focusTime > 0 || breakTime > 0) {
          chartData.focusBreakdown = {
            type: 'doughnut',
            data: {
              labels: ['Focus Time (>25 min)', 'Short Sessions (<25 min)'],
              datasets: [{
                data: [focusTime, breakTime],
                backgroundColor: [
                  'rgba(40, 167, 69, 0.8)',
                  'rgba(255, 193, 7, 0.8)'
                ],
                borderColor: [
                  'rgba(40, 167, 69, 1)',
                  'rgba(255, 193, 7, 1)'
                ],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                },
                title: {
                  display: true,
                  text: 'Focus Session Distribution'
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                      return `${label}: ${value.toFixed(1)}h (${percentage}%)`;
                    }
                  }
                }
              }
            }
          };
        }
      }
      
      return chartData;
    }
    
    // Generate report with API - WITH IMPROVED VALIDATION
    async generateWithAPI() {
      if (!this.apiClient) {
        this.showNotification('API client not available. Please check if api-client.js is loaded.', 'error');
        return;
      }
  
      try {
        this.showLoading(true);
        
        // Ensure custom models are loaded
        try {
          await this.apiClient.loadCustomModels();
        } catch (modelError) {
          console.error('Error loading custom models:', modelError);
        }
        
        const data = await this.gatherData();
        
        // Log data summary for debugging
        console.log('Report data summary:', {
          entriesCount: data.entries?.length || 0,
          dateRange: data.dateRange,
          totalHours: data.summary?.totalHours || 0,
          categories: Object.keys(data.categoryBreakdown || {}),
          hasChartData: !!data.chartData
        });
        
        // Generate chart data if charts are enabled
        let chartData = null;
        if (this.settings.includeCharts) {
          chartData = this.generateChartData(data);
          
          // Improved validation with better debugging
          if (chartData && Object.keys(chartData).length > 0) {
            let validCharts = {};
            let invalidReasons = [];
            
            // Validate each chart type individually
            for (let chartType in chartData) {
              const chart = chartData[chartType];
              let isValid = false;
              let reason = '';
              
              try {
                // Check basic structure
                if (!chart || typeof chart !== 'object') {
                  reason = `${chartType}: Invalid chart object`;
                } else if (!chart.data) {
                  reason = `${chartType}: Missing data property`;
                } else if (!chart.data.datasets || !Array.isArray(chart.data.datasets)) {
                  reason = `${chartType}: Missing or invalid datasets array`;
                } else if (chart.data.datasets.length === 0) {
                  reason = `${chartType}: Empty datasets array`;
                } else {
                  // Check each dataset
                  for (let i = 0; i < chart.data.datasets.length; i++) {
                    const dataset = chart.data.datasets[i];
                    
                    if (!dataset.data || !Array.isArray(dataset.data)) {
                      reason = `${chartType}: Dataset ${i} missing data array`;
                      break;
                    }
                    
                    // Data sanitization is already done in generateChartData
                    // Just check if we have data points
                    const hasValidLength = dataset.data.length > 0;
                    
                    // Consider the chart valid if it has data points
                    if (hasValidLength) {
                      isValid = true;
                      
                      // Log if all values are zero as this might be intentional
                      const hasNonZeroData = dataset.data.some(v => v !== 0);
                      if (!hasNonZeroData) {
                        console.log(`Note: ${chartType} has all zero values - this may be expected for periods with no activity`);
                      }
                    } else {
                      reason = `${chartType}: Dataset ${i} has no data points`;
                    }
                  }
                }
                
                // If validation passed, add to valid charts
                if (isValid) {
                  validCharts[chartType] = chart;
                  console.log(`✓ ${chartType} chart validated successfully`);
                } else if (reason) {
                  invalidReasons.push(reason);
                }
                
              } catch (error) {
                console.error(`Error validating ${chartType}:`, error);
                invalidReasons.push(`${chartType}: Validation error - ${error.message}`);
              }
            }
            
            // Log validation results for debugging
            if (Object.keys(validCharts).length > 0) {
              console.log(`Chart validation complete: ${Object.keys(validCharts).length} valid charts found`);
              console.log('Valid chart types:', Object.keys(validCharts));
              chartData = validCharts;
            } else {
              console.log('No valid charts found. Reasons:', invalidReasons);
              console.log('Original chart data structure:', JSON.stringify(chartData, null, 2));
              chartData = null;
            }
          } else {
            console.log('No chart data generated - charts may be disabled or no data available');
          }
        }
        
        const provider = document.getElementById('llmProvider')?.value || 'openai';
        const model = document.getElementById('llmModel')?.value || 'gpt-4o';
        const systemPrompt = document.getElementById('systemPrompt')?.value || '';
        const userPrompt = document.getElementById('userPrompt')?.value || '';
        
        if (!provider || !model) {
          throw new Error('Please select a provider and model');
        }
        
        if (!systemPrompt && !userPrompt) {
          throw new Error('Please provide at least one prompt');
        }
        
        const parameters = {
          temperature: parseFloat(document.getElementById('temperature')?.value || 0.7),
          max_tokens: parseInt(document.getElementById('maxTokens')?.value || 8000)
        };
  
        const report = await this.apiClient.generateReport({
          provider,
          model,
          systemPrompt,
          userPrompt,
          data,
          parameters,
          includeCharts: this.settings.includeCharts,
          template: this.settings.template
        });
        
        // Add chart data to the report
        if (chartData) {
          report.chartData = chartData;
        }
        
        // Save the report
        const savedReport = await this.apiClient.saveReport(report);
        
        this.currentReport = savedReport;
        this.displayReport(savedReport);
        this.showNotification('✅ Report generated and saved successfully!', 'success');
        this.showLoading(false);
        
        // Refresh report history if on options page
        if (window.loadReportHistory) {
          window.loadReportHistory();
        }
        
      } catch (error) {
        console.error('Error generating report:', error);
        this.showNotification(`❌ Failed to generate report: ${error.message}`, 'error');
        this.showLoading(false);
      }
    }

    // Display generated report
    displayReport(report) {
      const modal = document.getElementById('reportViewerModal');
      const content = document.getElementById('reportContent');
      
      if (modal && content) {
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
        let reportHTML = report.content || report.html || report.reportContent || '';
        
        // If report is a string, use it directly
        if (typeof report === 'string') {
          reportHTML = report;
        }
        
        // Convert markdown-style formatting to HTML if the content appears to be markdown
        if (reportHTML.includes('**') || reportHTML.includes('##')) {
          reportHTML = this.convertMarkdownToHTML(reportHTML);
        }
        
        // Extract and process chart containers from the report HTML
        const chartMatches = reportHTML.match(/<div class="chart-container"[^>]*>[\s\S]*?<\/div>/g) || [];
        const chartIds = [];
        
        // Replace chart divs with unique placeholders temporarily
        chartMatches.forEach((chartDiv, index) => {
          const placeholder = `<!--CHART_PLACEHOLDER_${index}-->`;
          reportHTML = reportHTML.replace(chartDiv, placeholder);
          
          // Extract chart ID from the div
          const idMatch = chartDiv.match(/data-chart-id="([^"]+)"/);
          if (idMatch) {
            chartIds.push(idMatch[1]);
          }
        });
        
        // Build the final HTML with proper chart containers
        let chartsHTML = '';
        if (report.chartData && this.settings.includeCharts) {
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
            <button class="button success" id="saveReportBtn" style="white-space: nowrap;">💾 Save Report</button>
          </div>
          <div id="reportContentBody" style="padding: 20px; background: #f9f9f9; border-radius: 8px; width: 100%; box-sizing: border-box;">
            <div class="report-text" style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; width: 100%; box-sizing: border-box;">
              ${reportHTML}
            </div>
            ${chartsHTML}
          </div>
        `;
        
        content.innerHTML = finalHTML;
        
        // Fix modal display with proper flex properties
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        // Ensure modal content has proper width
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
          modalContent.style.maxWidth = '900px';
          modalContent.style.width = '95%';
        }
        
        this.currentReport = report;
        
        // Add event listeners for buttons with delay to ensure DOM is ready
        setTimeout(() => {
          document.getElementById('copyReportToEmail')?.addEventListener('click', () => this.copyReportForEmail());
          document.getElementById('copyReportAsText')?.addEventListener('click', () => this.copyReportAsText());
          document.getElementById('copyReportAsHTML')?.addEventListener('click', () => this.copyReportAsHTML());
          document.getElementById('saveReportBtn')?.addEventListener('click', () => this.saveCurrentReport());
          
          // Render charts if data exists - add extra delay for canvas elements
          if (report.chartData && this.settings.includeCharts) {
            requestAnimationFrame(() => {
              setTimeout(() => {
                this.renderChartsFromData(report.chartData);
              }, 150);
            });
          }
        }, 100);
      }
    }

  // Convert basic markdown to HTML - Comprehensive version
  convertMarkdownToHTML(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    // Preserve code blocks first (to avoid processing their content)
    const codeBlocks = [];
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
      codeBlocks.push(`<pre><code>${this.escapeHtml(code.trim())}</code></pre>`);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });
    
    // Preserve inline code
    const inlineCodes = [];
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      inlineCodes.push(`<code>${this.escapeHtml(code)}</code>`);
      return `__INLINECODE${inlineCodes.length - 1}__`;  // <- no underscore
    });

    // Restore code blocks
    codeBlocks.forEach((block, index) => {
      const placeholder = new RegExp(`__CODE_BLOCK_${index}__`, 'g');
      html = html.replace(placeholder, block);
    });

    // Restore inline codes
    inlineCodes.forEach((code, index) => {
      const placeholder = new RegExp(`__INLINECODE${index}__`, 'g');  // <- match no underscore
      html = html.replace(placeholder, code);
    });

    // Clean up any remaining placeholders
    html = html.replace(/__INLINECODE\d+__/g, '');

        
    // Convert tables (must be before other conversions)
    html = this.convertMarkdownTables(html);
    
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

    
    // Convert links with title
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\s+"([^"]+)"\)/g, '<a href="$2" title="$3">$1</a>');
    // Convert links without title
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Convert images with alt text
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    
    // Convert bold and italic (order matters)
    html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
    
    // Convert bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Convert italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Convert strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    
    // Convert unordered lists (must handle nested lists)
    html = this.convertMarkdownLists(html);
    
    // Convert line breaks (two spaces at end of line)
    html = html.replace(/  $/gm, '<br>');
        
    // Convert paragraphs (lines not already wrapped in HTML tags)
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
  
  // Helper method to escape HTML
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
  
  // Convert markdown tables to HTML
  convertMarkdownTables(text) {
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
          const table = this.parseMarkdownTable(tableLines);
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
  parseMarkdownTable(lines) {
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
  
  // Convert markdown lists (handles nested lists)
  convertMarkdownLists(text) {
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
          const indent = lines[i].match(/^([\s]*)/)[1].length;
          const content = lines[i].replace(/^[\s]*[\*\-\+] /, '');
          listItems.push({ indent, content });
          i++;
        }
        
        // Build nested list HTML
        result.push(this.buildNestedList(listItems, listType));
      }
      // Check for ordered list
      else if (line.match(/^[\s]*\d+\. .+$/)) {
        const listItems = [];
        const listType = 'ol';
        
        // Collect all list items
        while (i < lines.length && lines[i].match(/^[\s]*\d+\. .+$/)) {
          const indent = lines[i].match(/^([\s]*)/)[1].length;
          const content = lines[i].replace(/^[\s]*\d+\. /, '');
          listItems.push({ indent, content });
          i++;
        }
        
        // Build nested list HTML
        result.push(this.buildNestedList(listItems, listType));
      }
      else {
        result.push(line);
        i++;
      }
    }
    
    return result.join('\n');
  }
  
  // Build nested list HTML
  buildNestedList(items, listType) {
    if (items.length === 0) return '';
    
    const tag = listType === 'ol' ? 'ol' : 'ul';
    let html = `<${tag}>`;
    
    for (let i = 0; i < items.length; i++) {
      html += `<li>${items[i].content}</li>`;
    }
    
    html += `</${tag}>`;
    return html;
  }

// Render charts from chart data - FIXED FOR POPUP
renderChartsFromData(chartData) {
  // Check if Chart.js is available
  const ChartJS = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);
  if (!ChartJS) {
    console.error('Chart.js is not loaded. Please ensure chart.min.js is included.');
    return;
  }
  
  // Helper function to render chart WITHOUT ANIMATIONS
  const renderChart = (canvasId, config) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    try {
      // Clear any existing chart
      if (canvas.chart) {
        canvas.chart.destroy();
        canvas.chart = null;
      }
      
      // Get context
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // DISABLE ANIMATIONS for immediate rendering
      const enhancedConfig = {
        ...config,
        options: {
          ...config.options,
          responsive: true,
          maintainAspectRatio: false,
          animation: false // <-- KEY CHANGE: No animations
        }
      };
      
      canvas.chart = new ChartJS(ctx, enhancedConfig);
      canvas.chart.render(); // Force immediate render
      
    } catch (error) {
      console.error(`Error rendering chart ${canvasId}:`, error);
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
  
// Copy report for email
// Ensure charts are fully rendered before operations - MINIMAL VERSION
async ensureChartsRendered() {
  // Since charts are already visible, just a small delay to ensure stability
  await new Promise(resolve => setTimeout(resolve, 50));
}

// Helper method to convert canvas charts to images - DIRECT CAPTURE
async convertChartsToImages(container) {
  // Get all canvases from the ORIGINAL document, not the cloned container
  const originalCanvases = document.querySelectorAll('#reportContentBody canvas');
  const clonedCanvases = container.querySelectorAll('canvas');
  
  // Match up original canvases with cloned ones and copy the image data
  for (let i = 0; i < originalCanvases.length && i < clonedCanvases.length; i++) {
    try {
      const originalCanvas = originalCanvases[i];
      const clonedCanvas = clonedCanvases[i];
      
      // Skip if no dimensions
      if (!originalCanvas.width || !originalCanvas.height) continue;
      
      // Get the image directly from the ORIGINAL canvas that's already rendered
      const dataUrl = originalCanvas.toDataURL('image/png', 1.0);
      
      // Verify the data URL is valid
      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
        console.warn('Invalid data URL from original canvas');
        continue;
      }
      
      // Create image element
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.cssText = clonedCanvas.style.cssText || '';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.width = originalCanvas.width;
      img.height = originalCanvas.height;
      img.alt = 'Chart';
      
      // Replace the cloned canvas with the image
      clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
      
    } catch (error) {
      console.error('Error converting canvas:', error);
    }
  }
}

// Copy report for email - FIXED FOR POPUP CHARTS
async copyReportForEmail() {
  if (!this.currentReport) return;
  
  try {
    // Ensure charts are fully rendered first
    await this.ensureChartsRendered();
    
    const reportBody = document.getElementById('reportContentBody');
    if (!reportBody) return;
    
    // Clone the report body to avoid modifying the original
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reportBody.innerHTML;
    
    // Convert canvas charts to images in the clone
    await this.convertChartsToImages(tempDiv);
    
    // Remove scripts and styles for email
    tempDiv.querySelectorAll('script').forEach(el => el.remove());
    tempDiv.querySelectorAll('style').forEach(el => el.remove());
    
    // Create a temporary element for copying
    document.body.appendChild(tempDiv);
    
    // Select and copy
    const range = document.createRange();
    range.selectNodeContents(tempDiv);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    document.execCommand('copy');
    selection.removeAllRanges();
    document.body.removeChild(tempDiv);
    
    this.showNotification('✅ Report copied for email with charts!', 'success');
  } catch (error) {
    console.error('Error copying report:', error);
    this.showNotification('❌ Failed to copy report', 'error');
  }
}

// Copy report as plain text - NO CHARTS NEEDED
async copyReportAsText() {
  if (!this.currentReport) return;
  
  try {
    const reportBody = document.getElementById('reportContentBody');
    if (!reportBody) return;
    
    const plainText = reportBody.innerText || reportBody.textContent;
    await navigator.clipboard.writeText(plainText);
    
    this.showNotification('✅ Report copied as text!', 'success');
  } catch (error) {
    console.error('Error copying report:', error);
    this.showNotification('❌ Failed to copy report', 'error');
  }
}

// Copy report as HTML - FIXED FOR POPUP CHARTS
async copyReportAsHTML() {
  if (!this.currentReport) return;
  
  try {
    // Ensure charts are fully rendered first
    await this.ensureChartsRendered();
    
    const reportBody = document.getElementById('reportContentBody');
    if (!reportBody) return;
    
    // Clone the report body
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reportBody.innerHTML;
    
    // Convert charts to images
    await this.convertChartsToImages(tempDiv);
    
    const htmlContent = tempDiv.innerHTML;
    
    // Try to copy as HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({ 'text/html': blob });
    
    await navigator.clipboard.write([clipboardItem]);
    this.showNotification('✅ Report copied as HTML with charts!', 'success');
  } catch (error) {
    // Fallback to text copy
    console.error('HTML copy not supported, falling back to text:', error);
    await this.copyReportAsText();
  }
}
  // Save current report
  async saveCurrentReport() {
    if (!this.currentReport) return;
    
    try {
      // Report should already be saved, but update it if needed
      const savedReport = await this.apiClient.saveReport(this.currentReport);
      
      this.showNotification('✅ Report saved successfully!', 'success');
      
      // Refresh report history if available
      if (window.loadReportHistory) {
        window.loadReportHistory();
      }
    } catch (error) {
      console.error('Error saving report:', error);
      this.showNotification('❌ Failed to save report', 'error');
    }
  }
  
  // Preview data
  async previewData() {
    try {
      const data = await this.gatherData();
      
      const modal = document.getElementById('dataPreviewModal');
      const content = document.getElementById('dataPreviewContent');
      
      if (modal && content) {
        content.textContent = JSON.stringify(data, null, 2);
        modal.style.display = 'flex';
      }
    } catch (error) {
      console.error('Error in previewData:', error);
      
      // Show error details in the preview modal
      const modal = document.getElementById('dataPreviewModal');
      const content = document.getElementById('dataPreviewContent');
      
      if (modal && content) {
        const errorData = {
          error: error.message,
          fallbackData: {
            dateRange: this.getDateRange(),
            message: "Error gathering data. Check console for details.",
            summary: {
              totalHours: 0,
              totalEntries: 0,
              uniqueTasks: 0,
              uniqueCategories: 0
            },
            entries: []
          }
        };
        content.textContent = JSON.stringify(errorData, null, 2);
        modal.style.display = 'flex';
        this.showNotification('Error loading data. Showing fallback structure.', 'warning');
      }
    }
  }
  
  // Copy data only
  async copyDataOnly() {
    try {
      const data = await this.gatherData();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      this.showNotification('✅ Data copied to clipboard!', 'success');
      
      // Close the preview modal
      const modal = document.getElementById('dataPreviewModal');
      if (modal) modal.style.display = 'none';
    } catch (error) {
      console.error('Error copying data:', error);
      this.showNotification('❌ Failed to copy data', 'error');
    }
  }
  
  // Show/hide loading state
  showLoading(show) {
    const loader = document.getElementById('reportLoader');
    const generateBtn = document.getElementById('generateReportBtn');
    
    if (loader) {
      loader.style.display = show ? 'block' : 'none';
    }
    
    if (generateBtn) {
      generateBtn.disabled = show;
      if (show) {
        generateBtn.textContent = '⏳ Generating...';
      } else {
        generateBtn.textContent = this.settings.mode === 'api' ? 
          '🚀 Generate Report with AI' : '📋 Copy Prompt & Data';
      }
    }
  }
  
  // Show notification
  // Show notification - Enhanced for all contexts
  showNotification(message, type = 'info') {
    // Create or get notification element
    let notification = document.getElementById('aiReportNotification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'aiReportNotification';
      document.body.appendChild(notification);
    }
    
    // Set styles based on type
    const styles = {
      success: 'background: linear-gradient(135deg, #10893e, #14cc60); color: white;',
      error: 'background: linear-gradient(135deg, #d83b01, #e74c0e); color: white;',
      warning: 'background: linear-gradient(135deg, #ffc107, #ff9800); color: #333;',
      info: 'background: linear-gradient(135deg, #0078d4, #106ebe); color: white;'
    };
    
    // Check if we're in a modal
    const reportModal = document.getElementById('reportViewerModal');
    const isModalOpen = reportModal && (reportModal.style.display === 'flex' || reportModal.style.display === 'block');
    
    // Apply styles and message
    notification.style.cssText = `
      position: fixed;
      ${isModalOpen ? 'top: 50%; left: 50%; transform: translate(-50%, -50%);' : 'top: 20px; right: 20px;'}
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
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        notification.style.display = 'none';
      }, 300);
    }, 3000);
    
    // Log to console for debugging
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
  
  // Load report history (for options page)
  async loadReportHistory() {
    if (window.loadReportHistory) {
      window.loadReportHistory();
    }
  }
  
}

// Export the class
window.UnifiedAIReports = UnifiedAIReports;

// Auto-initialize if on popup page
if (document.getElementById('aiReportBtn')) {
  document.addEventListener('DOMContentLoaded', () => {
    window.aiReports = new UnifiedAIReports();
    window.aiReports.init();
  });
}