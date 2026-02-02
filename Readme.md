# PlanFirst CLI

> A planning layer for AI coding agents - turns your intent into detailed, verifiable implementation plans.

## 🎯 What is PlanFirst?

PlanFirst is inspired by [Traycer](https://www.traycer.ai/) - it acts as an intelligent planning layer that sits between your idea and AI coding agents (like Cursor, Claude Code, GitHub Copilot). Instead of letting AI agents jump straight to code, PlanFirst:

1. **Analyzes** your codebase structure
2. **Generates** detailed, phase-based implementation plans
3. **Exports** plans for any coding agent to execute
4. **Verifies** implementations match the plan

## 🚀 Key Features

- **📊 Codebase Analysis**: Automatically understands your project structure, language, and framework
- **🤖 AI-Powered Planning**: Uses Claude to generate detailed implementation plans
- **📝 Phase-Based Approach**: Breaks complex tasks into manageable phases
- **✅ Verification**: Compares implementations against plans to catch gaps and regressions
- **🔄 Agent Agnostic**: Works with any coding agent (Cursor, Claude Code, etc.)
- **📦 Export Formats**: Markdown, JSON, and agent-specific formats

## 📋 Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Anthropic API key (for AI-powered plan generation)

## 🛠️ Installation

### Local Development Setup

```bash
# Clone or create project directory
mkdir planfirst-cli && cd planfirst-cli

# Initialize project
npm init -y

# Install dependencies
npm install commander chalk ora dotenv fs-extra glob ignore

# Install dev dependencies
npm install -D typescript @types/node @types/fs-extra ts-node nodemon @types/glob

# Create project structure
mkdir -p src/{commands,core,utils,types,templates} plans .planfirst

# Build the project
npm run build
```

### Get Your Anthropic API Key

1. Sign up at [https://console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Set it as an environment variable:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

Or add to `.env` file:
```
ANTHROPIC_API_KEY=your_api_key_here
```

## 📚 Usage

### 1. Initialize PlanFirst

```bash
# Navigate to your project
cd your-project

# Initialize PlanFirst
npm run dev -- init

# Or if installed globally
planfirst init
```

This will:
- Analyze your project structure
- Create `.planfirst/` configuration directory
- Create `plans/` directory for generated plans
- Detect language, framework, and dependencies

### 2. Generate a Plan

```bash
# Generate a plan from description
npm run dev -- plan "Add user authentication with JWT"

# Interactive mode with clarifying questions
npm run dev -- plan --interactive

# Specify output format
npm run dev -- plan "Add REST API for users" --format json
```

Example output:
```
━━━ Generating Plan ━━━

✓ Analyzing codebase...
✓ Generating implementation plan...
✓ Breaking down into phases...
✓ Plan saved: plans/plan-1738483200000.md

Plan ID: plan-1738483200000
Phases: 3
Files affected: 5
Estimated complexity: medium
```

### 3. View Generated Plan

```bash
# Show plan details
npm run dev -- show plan-1738483200000

# List all plans
npm run dev -- list
```

### 4. Export for Coding Agent

```bash
# Export as markdown
npm run dev -- export plan-1738483200000 --format markdown

# Export specific phase
npm run dev -- export plan-1738483200000 --phase 1

# Export for Cursor
npm run dev -- export plan-1738483200000 --format cursor -o implementation.md
```

### 5. Verify Implementation

```bash
# After implementing the plan with your coding agent
npm run dev -- verify plan-1738483200000

# Verify specific phase
npm run dev -- verify plan-1738483200000 --phase 1

# Generate verification report
npm run dev -- verify plan-1738483200000 --report verification-report.md
```

## 📖 Example Workflow

### Scenario: Adding User Profile Feature

```bash
# 1. Initialize (if not already done)
planfirst init

# 2. Generate plan
planfirst plan "Add user profile page with edit functionality"

# Output:
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

# Output:
# ✓ UserProfile component created
# ✓ Route added to router
# ⚠ Missing prop types definition
# ℹ 2/3 tasks completed

# 6. Continue with next phases...
```

## 🏗️ Project Structure

```
planfirst-cli/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/
│   │   ├── init.ts           # Initialize command
│   │   ├── plan.ts           # Generate plan
│   │   ├── verify.ts         # Verify implementation
│   │   └── export.ts         # Export plan
│   ├── core/
│   │   ├── analyzer.ts       # Codebase analysis
│   │   ├── planner.ts        # Plan generation
│   │   ├── verifier.ts       # Verification logic
│   │   └── phaser.ts         # Phase management
│   ├── utils/
│   │   ├── fileSystem.ts     # File operations
│   │   ├── parser.ts         # Code parsing
│   │   ├── logger.ts         # Logging
│   │   └── ai.ts             # AI integration
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── templates/
│       └── plan-template.md  # Plan template
├── plans/                     # Generated plans
├── .planfirst/               # Config and cache
│   ├── config.json
│   └── metadata.json
├── dist/                      # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

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
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "maxTokens": 4096,
    "temperature": 0.7
  },
  "verification": {
    "strictMode": false,
    "ignoreWarnings": false,
    "autoFix": false
  }
}
```

## 🎨 CLI Commands

### `planfirst init`
Initialize PlanFirst in your project
- Creates configuration
- Analyzes project structure
- Sets up directories

### `planfirst plan <description>`
Generate implementation plan
- `-i, --interactive` - Interactive mode
- `-o, --output <path>` - Output file path
- `-f, --format <format>` - Output format (markdown, json)

### `planfirst verify <plan-id>`
Verify implementation
- `-p, --phase <number>` - Verify specific phase
- `-t, --task <id>` - Verify specific task
- `--fix` - Auto-fix issues
- `-r, --report <path>` - Save report

### `planfirst export <plan-id>`
Export plan for agents
- `-f, --format <format>` - Export format
- `-o, --output <path>` - Output file
- `-p, --phase <number>` - Export specific phase

### `planfirst list`
List all plans

### `planfirst show <plan-id>`
Show plan details

## 🧪 Development

```bash
# Start development server with auto-reload
npm run dev

# Build for production
npm run build

# Run compiled version
npm start

# Type checking
npm run type-check

# Linting (if configured)
npm run lint
```

## 📝 License

MIT

## 🙏 Acknowledgments

Inspired by [Traycer](https://traycer.ai/) - the concept of a planning layer for AI coding agents.

## 📧 Support

For questions or issues, please check the documentation or create an issue in the repository.

---
