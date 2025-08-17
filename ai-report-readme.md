# 🤖 AI Report Generator - User Guide

## Overview

The AI Report Generator is a powerful feature that transforms your calendar and productivity data into insightful, AI-powered reports. It supports two modes of operation:

1. **Copy Mode** - Generate formatted prompts to use with any LLM (ChatGPT, Claude, Gemini, etc.)
2. **API Mode** - Direct integration with AI providers for automatic report generation

## 🚀 Quick Start

### Step 1: Access the Feature
Click the "✨ Generate AI Report" button in the extension popup to open the AI Report Generator modal.

### Step 2: Choose Your Mode

#### Copy Mode (No API Key Required)
- Select "📋 Copy for External Use"
- Configure your report settings
- Click "Copy to Clipboard"
- Paste into your preferred AI chat (ChatGPT, Claude, Gemini, etc.)

#### API Mode (Requires API Keys)
- Select "🚀 Generate with API"
- Configure API keys in Settings (see [API Setup](#api-setup))
- Click "Generate Report" for instant AI analysis

## 📊 Report Templates

### Built-in Templates

#### 1. **Productivity Analysis** 📊
Comprehensive analysis of your work patterns and efficiency.
- Time allocation breakdown
- Focus time vs. meeting time
- Productivity score calculation
- Task completion metrics

#### 2. **Goals & Deliverables** 🎯
Track progress on objectives and key results.
- Goal completion status
- Deliverables timeline
- Milestone tracking
- Achievement highlights

#### 3. **Time Pattern Analysis** 🔍
Discover patterns in how you spend your time.
- Peak productivity hours
- Meeting distribution
- Task duration patterns
- Time optimization opportunities

#### 4. **Optimization Recommendations** 💡
AI-powered suggestions for improving productivity.
- Schedule optimization tips
- Meeting reduction strategies
- Focus time recommendations
- Workflow improvements

#### 5. **Executive Summary** 📈
High-level overview for stakeholders.
- Key metrics dashboard
- Achievement highlights
- Strategic insights
- Action items

### Custom Templates

Create your own templates tailored to your specific needs:

1. Go to Settings → AI Report Settings
2. Click "+ Add New Template"
3. Configure:
   - **Template Name**: Descriptive name for your template
   - **System Prompt**: Define the AI's role and expertise
   - **User Prompt**: Specific instructions for report content

#### Custom Template Examples

**Weekly Team Standup**
```
System: You are a project manager creating a team update.
User: Summarize weekly progress, blockers, and upcoming priorities.
```

**Client Status Report**
```
System: You are a consultant preparing a client update.
User: Highlight deliverables, time invested, and next steps.
```

## ⚙️ Configuration Options

### Data Inclusion Settings

Configure what data to include in your reports:

- ✅ **Multi-tasking Data** - Analyze overlapping events
- ✅ **Deliverables & Goals** - Include goal tracking
- ✅ **Meeting Analysis** - Detailed meeting insights
- ✅ **Category Breakdown** - Time by category
- ✅ **Daily Patterns** - Hour-by-hour analysis
- ✅ **Productivity Scores** - Calculated efficiency metrics

### Date Range Options

- Today
- Yesterday
- This Week
- Last Week
- This Month
- Custom Range

### Report Format Options

- **Detailed Analysis** - Comprehensive insights with all sections
- **Summary View** - Concise overview with key points
- **Bullet Points** - Quick-scan format
- **Narrative Style** - Story-like report format

## 🔑 API Setup

### Supported Providers

#### OpenAI (ChatGPT)
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add key in Settings → API Keys → OpenAI
3. Available models:
   - GPT-4o
   - GPT-4o-mini
   - GPT-4-turbo
   - GPT-3.5-turbo

#### Anthropic (Claude)
1. Get API key from [console.anthropic.com](https://console.anthropic.com)
2. Add key in Settings → API Keys → Anthropic
3. Available models:
   - Claude 3.5 Sonnet
   - Claude 3 Opus
   - Claude 3 Haiku

#### Google (Gemini)
1. Get API key from [makersuite.google.com](https://makersuite.google.com)
2. Add key in Settings → API Keys → Google
3. Available models:
   - Gemini 1.5 Pro
   - Gemini 1.5 Flash
   - Gemini 1.0 Pro

### Adding Custom Models

Support for newer models as they become available:

1. Settings → Custom AI Models
2. Click "+ Add Custom Model"
3. Configure:
   - Provider (OpenAI/Anthropic/Google)
   - Model ID (exact API identifier)
   - Display Name
   - Max Tokens

## 📋 Copy Template Format

When using Copy Mode, the extension generates a structured prompt:

```markdown
[SYSTEM CONTEXT]
You are an AI productivity analyst specializing in time management...

[USER REQUEST]
Please analyze the following calendar and productivity data...

[DATA]
Date Range: [Selected Period]
Total Events: [Count]
Categories: [List]

[DETAILED EVENTS]
- Event 1: [Time] - [Title] - [Duration]
- Event 2: [Time] - [Title] - [Duration]
...

[METRICS]
- Focus Time: [Hours]
- Meeting Time: [Hours]
- Multi-tasking: [Instances]
...

[ANALYSIS REQUEST]
Please provide:
1. [Specific analysis point]
2. [Specific analysis point]
...
```

## 💡 Best Practices

### For Accurate Reports
1. **Categorize Events** - Use consistent categories for better analysis
2. **Add Descriptions** - Include context in event descriptions
3. **Mark Deliverables** - Flag completed tasks and milestones
4. **Regular Updates** - Keep calendar current for accurate insights

### For API Usage
1. **Start with Smaller Models** - Test with cost-effective models first
2. **Save Useful Reports** - Reports are automatically saved for reference
3. **Refine Templates** - Customize prompts for your specific needs
4. **Monitor Usage** - Track API costs through provider dashboards

### For Copy Mode
1. **Use Latest AI Models** - Paste into the newest version of your preferred AI
2. **Provide Context** - Add additional context when pasting if needed
3. **Iterate on Prompts** - Refine the generated prompt for better results
4. **Save Good Outputs** - Keep useful reports for future reference

## 📊 Report History

All generated reports are automatically saved:

- View past reports in Settings → Report History
- Copy previous reports for reuse
- Delete outdated reports
- Export reports as needed

## 🛠️ Troubleshooting

### Common Issues

**"API Key Required" Error**
- Ensure API key is correctly entered in Settings
- Check key hasn't expired
- Verify billing is active on provider account

**"No Data Available" Message**
- Sync your calendar first
- Select a date range with events
- Check calendar permissions

**"Report Generation Failed"**
- Check internet connection
- Verify API key is valid
- Try a different model
- Reduce date range

### Getting Help

1. Check the built-in help tooltips (hover over ℹ️ icons)
2. Review error messages for specific guidance
3. Contact support with:
   - Screenshot of error
   - Browser/extension version
   - Steps to reproduce

## 🔒 Privacy & Security

- **Local Processing** - Data analysis happens locally in your browser
- **Secure Storage** - API keys are encrypted and stored locally
- **No Data Collection** - Your calendar data is never sent to our servers
- **Direct API Calls** - When using API mode, data goes directly to your chosen AI provider

## 📈 Advanced Features

### Batch Report Generation
Generate multiple reports at once:
1. Select multiple date ranges
2. Choose different templates
3. Generate in sequence

### Report Scheduling (Coming Soon)
- Daily/weekly automated reports
- Email delivery options
- Slack integration

### Team Analytics (Premium)
- Aggregate team calendars
- Department-wide insights
- Comparative analysis

## 📝 Example Use Cases

### Weekly Review
Use the "Productivity Analysis" template every Friday to:
- Review week's accomplishments
- Identify time wasters
- Plan next week's priorities

### Monthly Reporting
Use "Executive Summary" template for:
- Stakeholder updates
- Performance reviews
- Project status reports

### Daily Standup
Use custom template to:
- Summarize yesterday's work
- List today's priorities
- Identify blockers

## 🎯 Tips for Great Reports

1. **Be Specific** - The more detailed your calendar, the better the insights
2. **Use Tags** - Consistent tagging improves categorization
3. **Include Context** - Add meeting agendas and outcomes
4. **Regular Reviews** - Generate reports consistently for trend analysis
5. **Experiment** - Try different templates and settings

## 📚 Additional Resources

- [API Provider Documentation](#)
- [Template Library](#)
- [Video Tutorials](#)
- [Community Forum](#)

---

*Last Updated: 2024*
*Version: 1.0.0*