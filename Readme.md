# PlanFirst CLI

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ██████╗ ██╗      █████╗ ███╗   ██╗███████╗██╗██████╗ ███████╗████████╗   ║
║   ██╔══██╗██║     ██╔══██╗████╗  ██║██╔════╝██║██╔══██╗██╔════╝╚══██╔══╝   ║
║   ██████╔╝██║     ███████║██╔██╗ ██║█████╗  ██║██████╔╝███████╗   ██║      ║
║   ██╔═══╝ ██║     ██╔══██║██║╚██╗██║██╔══╝  ██║██╔══██╗╚════██║   ██║      ║
║   ██║     ███████╗██║  ██║██║ ╚████║██║     ██║██║  ██║███████║   ██║      ║
║   ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝      ║
║                                                          ║
║              Planning Layer for AI Coding Agents         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

> A planning layer for AI coding agents - turns your intent into detailed, verifiable implementation plans.

## 🎯 What is PlanFirst?

PlanFirst is inspired by [Traycer](https://www.traycer.ai/) - it acts as an intelligent planning layer that sits between your idea and AI coding agents (like Cursor, Claude Code, GitHub Copilot). Instead of letting AI agents jump straight to code, PlanFirst:

1. **Analyzes** your codebase structure
2. **Generates** detailed, phase-based implementation plans with AI
3. **Exports** plans for any coding agent to execute
4. **Verifies** implementations match the plan

## 🚀 Key Features

- 📊 **Codebase Analysis**: Automatically understands your project structure, language, and framework
- 🤖 **AI-Powered Planning**: Uses OpenAI or Anthropic to generate detailed implementation plans
- 📝 **Phase-Based Approach**: Breaks complex tasks into manageable phases
- ✅ **Verification**: Compares implementations against plans to catch gaps and regressions
- 🔄 **Agent Agnostic**: Works with any coding agent (Cursor, Claude Code, etc.)
- 📦 **Export Formats**: Markdown, JSON, and agent-specific formats

## 📋 Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm
- **AI API key** (choose one):
  - **OpenAI API key** (recommended) - [Get one here](https://platform.openai.com/api-keys)
  - **Anthropic API key** - [Get one here](https://console.anthropic.com)

## 🛠️ Installation

### Global Installation (Recommended)

```bash
npm install -g planfirst-cli
```

### Local Installation

```bash
npm install planfirst-cli
```

## 🔑 Setup

### Set Your API Key

**Option 1: OpenAI (Recommended - Easier to Get)**

```bash
export OPENAI_API_KEY=your_openai_api_key_here
```

**Option 2: Anthropic Claude**

```bash
export ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**Option 3: Use .env File**

```bash
# In your project directory
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

> **Note**: PlanFirst automatically detects which API key you've set and uses it. If both are set, it prefers OpenAI.

## 📚 Quick Start

### 1. Initialize PlanFirst

```bash
cd your-project
planfirst init
```

This will:
- Analyze your project structure
- Create `.planfirst/` configuration directory
- Create `plans/` directory for generated plans
- Detect language, framework, and dependencies

### 2. Generate a Plan

```bash
planfirst plan "Add user authentication with JWT"
```

Example output:
```
━━━ Generating Implementation Plan ━━━

✔ Codebase analyzed
✔ Plan generated
✔ Plan saved

╔═══════════════════════════════════════════════════════════╗
║        ✨  Plan Generated Successfully!  ✨            ║
╚═══════════════════════════════════════════════════════════╝

Plan Summary:
  Plan ID: plan-1738483200000
  Phases: 3
  Files Affected: 5
  Complexity: medium
```

### 3. Export for Your Coding Agent

```bash
# Export as markdown
planfirst export plan-1738483200000 --format markdown

# Export for Cursor (with checklist)
planfirst export plan-1738483200000 --format cursor

# Export specific phase
planfirst export plan-1738483200000 --phase 1
```

### 4. Verify Implementation

```bash
# After implementing with your coding agent
planfirst verify plan-1738483200000
```

## 📖 Example Workflow

### Scenario: Adding User Profile Feature

```bash
# 1. Initialize (if not already done)
planfirst init

# 2. Generate plan
planfirst plan "Add user profile page with edit functionality"

# Output shows:
# Plan ID: plan-001
# Phases: 3
#   Phase 1: Create profile route and component
#   Phase 2: Add edit form with validation  
#   Phase 3: Connect to backend API

# 3. Export phase 1 for implementation
planfirst export plan-001 --phase 1 -o phase1.md

# 4. Give phase1.md to your coding agent (Cursor, Claude Code, etc.)
# ... agent implements the code ...

# 5. Verify phase 1
planfirst verify plan-001 --phase 1

# Output shows:
# ✔ UserProfile component created
# ✔ Route added to router
# ⚠ Missing prop types definition
# ℹ 2/3 tasks completed

# 6. Continue with next phases...
```

## 🎨 CLI Commands

### `planfirst init`
Initialize PlanFirst in your project

**Options:**
- `-n, --name <name>` - Project name
- `--skip-analysis` - Skip initial codebase analysis

### `planfirst plan <description>`
Generate implementation plan

**Options:**
- `-i, --interactive` - Interactive mode with clarifying questions
- `-o, --output <path>` - Output file path
- `-f, --format <format>` - Output format (markdown, json)

**Examples:**
```bash
planfirst plan "Add REST API for users"
planfirst plan --interactive
planfirst plan "Add search feature" --format json
```

### `planfirst verify <plan-id>`
Verify implementation against plan

**Options:**
- `-p, --phase <number>` - Verify specific phase only
- `-t, --task <id>` - Verify specific task only
- `-r, --report <path>` - Save verification report to file

**Examples:**
```bash
planfirst verify plan-001
planfirst verify plan-001 --phase 1
planfirst verify plan-001 --report report.md
```

### `planfirst export <plan-id>`
Export plan for coding agents

**Options:**
- `-f, --format <format>` - Export format (markdown, json, cursor)
- `-o, --output <path>` - Output file path
- `-p, --phase <number>` - Export specific phase only

**Examples:**
```bash
planfirst export plan-001 --format cursor
planfirst export plan-001 --phase 1 -o phase1.md
```

### `planfirst list`
List all plans

**Options:**
- `-s, --status <status>` - Filter by status (draft, ready, in-progress, completed)

### `planfirst show <plan-id>`
Show plan details

**Options:**
- `-p, --phase <number>` - Show specific phase only

## ⚙️ Configuration

Edit `.planfirst/config.json` to customize behavior:

```json
{
  "version": "0.1.0",
  "projectRoot": "/path/to/project",
  "plansDirectory": "plans",
  "excludePatterns": [
    "node_modules/**",
    "dist/**",
    ".git/**"
  ],
  "ai": {
    "provider": "openai",
    "model": "gpt-4o",
    "maxTokens": 4096,
    "temperature": 0.7
  },
  "verification": {
    "strictMode": false,
    "ignoreWarnings": false
  }
}
```

### Supported AI Providers

**OpenAI:**
- Models: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
- Set: `OPENAI_API_KEY`

**Anthropic:**
- Models: `claude-sonnet-4-20250514`, `claude-opus-4-20250514`
- Set: `ANTHROPIC_API_KEY`

## 🗂️ Project Structure

```
your-project/
├── .planfirst/
│   ├── config.json       # Configuration
│   └── metadata.json     # Project metadata
├── plans/
│   ├── plan-001.json     # Plan data
│   └── plan-001.md       # Plan markdown
└── ... your project files
```

## 🧪 Development

```bash
# Clone the repository
git clone https://github.com/yourusername/planfirst-cli.git
cd planfirst-cli

# Install dependencies
npm install

# Start development server
npm run dev -- init

# Build for production
npm run build

# Run compiled version
npm start
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by [Traycer](https://www.traycer.ai/)
- Powered by OpenAI and Anthropic AI

---

**Made with ❤️ by Vishal Sharma**

*Build smarter with AI planning!* 🚀