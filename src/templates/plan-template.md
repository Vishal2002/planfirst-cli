# Traycer Simplified - Planning Document

## 1. UNDERSTANDING TRAYCER (First Principles Analysis)

### What Problem Does Traycer Solve?
**Core Problem**: AI coding agents (like Cursor, Claude Code, GitHub Copilot) often:
- Jump straight to code without proper planning
- Lose context in large codebases
- Hallucinate APIs or misread intent
- Create regressions and bugs
- Require extensive cleanup by developers

**Traycer's Solution**: Insert a planning layer BETWEEN the developer's intent and the code execution

### The Core Concept (Distilled)
```
Developer Intent → Planning Layer (Traycer) → Execution (Any Agent) → Verification → Code
```

### Key Principles:
1. **Spec-Driven Development**: Turn intent into structured, detailed plans BEFORE coding
2. **Separation of Concerns**: Planning ≠ Execution ≠ Verification
3. **Agent Agnostic**: Works with ANY coding agent (Cursor, Claude Code, etc.)
4. **Verification Loop**: Check if implementation matches the plan
5. **Phase-Based Approach**: Break complex tasks into smaller, manageable phases

### Traycer's Workflow:
```
1. PLAN Phase
   - User describes what they want to build
   - Traycer analyzes the codebase
   - Generates detailed plan with:
     * File-level changes
     * Dependencies
     * Reasoning/rationale
     * Step-by-step methodology
     * Mermaid diagrams (optional)

2. EXECUTE Phase
   - Hand off plan to any coding agent
   - Agent generates code based on plan
   - Can run multiple agents in parallel

3. VERIFY Phase
   - Compare generated code against plan
   - Detect gaps, regressions, issues
   - Suggest corrections
   - Iterate until satisfactory

4. ITERATE Phase
   - Refine plan based on verification
   - Re-execute if needed
   - Maintain context across iterations
```

---

## 2. SIMPLIFIED VERSION - "PlanFirst CLI"

### Project Name: **PlanFirst**
A CLI tool that acts as a planning layer for AI coding agents

### Core Features (MVP):
1. **Codebase Analysis**: Scan and understand project structure
2. **Plan Generation**: Create detailed implementation plans from user intent
3. **Plan Export**: Export plans in formats agents can consume
4. **Verification**: Basic comparison of changes against plan
5. **Phase Management**: Break tasks into phases

### Tech Stack:
- **Language**: TypeScript
- **Runtime**: Node.js
- **CLI Framework**: Commander.js or Yargs
- **File System**: fs-extra
- **Code Parsing**: @babel/parser or tree-sitter
- **LLM Integration**: Anthropic Claude API (for plan generation)
- **Output Format**: Markdown, JSON

---

## 3. ARCHITECTURE DESIGN

### Directory Structure:
```
planfirst-cli/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/
│   │   ├── init.ts           # Initialize project
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
│   │   └── ai.ts             # LLM integration
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── templates/
│       └── plan-template.md  # Plan template
├── plans/                     # Generated plans directory
├── .planfirst/               # Config and cache
├── package.json
├── tsconfig.json
└── README.md
```

### Data Models:

```typescript
interface Project {
  name: string;
  rootPath: string;
  language: string;
  framework?: string;
  structure: FileTree;
}

interface FileTree {
  [path: string]: {
    type: 'file' | 'directory';
    size?: number;
    language?: string;
    dependencies?: string[];
  };
}

interface Plan {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  phases: Phase[];
  metadata: {
    estimatedComplexity: 'low' | 'medium' | 'high';
    filesAffected: string[];
    dependencies: string[];
  };
}

interface Phase {
  id: string;
  order: number;
  name: string;
  description: string;
  tasks: Task[];
  dependencies: string[]; // Phase IDs
}

interface Task {
  id: string;
  type: 'create' | 'modify' | 'delete';
  file: string;
  description: string;
  reasoning: string;
  changes: Change[];
}

interface Change {
  location: string; // Function, class, or line range
  action: string;
  code?: string;
  rationale: string;
}

interface VerificationResult {
  planId: string;
  phaseId: string;
  taskId: string;
  status: 'match' | 'partial' | 'mismatch' | 'error';
  issues: Issue[];
  suggestions: string[];
}

interface Issue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line?: number;
}
```

---

## 4. IMPLEMENTATION PHASES

### Phase 1: Foundation (Day 1-2)
- [ ] Set up TypeScript + Node.js project
- [ ] Configure CLI framework
- [ ] Create basic project structure
- [ ] Implement file system utilities
- [ ] Add logging system
- [ ] Create configuration system

### Phase 2: Codebase Analysis (Day 2-3)
- [ ] Implement directory traversal
- [ ] Build file tree representation
- [ ] Detect programming language and framework
- [ ] Parse basic code structure
- [ ] Extract dependencies
- [ ] Create codebase summary

### Phase 3: Plan Generation (Day 3-4)
- [ ] Integrate Claude API
- [ ] Build plan generation prompts
- [ ] Implement phase breakdown logic
- [ ] Generate file-level task details
- [ ] Create plan templates
- [ ] Export plans in multiple formats (Markdown, JSON)

### Phase 4: Verification (Day 5-6)
- [ ] Implement diff detection
- [ ] Compare changes against plan
- [ ] Detect missing implementations
- [ ] Flag potential regressions
- [ ] Generate verification reports

### Phase 5: Polish & Testing (Day 6-7)
- [ ] Add comprehensive error handling
- [ ] Write unit tests
- [ ] Create documentation
- [ ] Add example projects
- [ ] Build demo video/GIF
- [ ] Package for distribution

---

## 5. CLI COMMANDS DESIGN

### `planfirst init`
Initialize PlanFirst in current project
```bash
planfirst init
# Creates .planfirst/ directory with config
# Analyzes codebase structure
# Generates initial project metadata
```

### `planfirst plan <description>`
Generate a plan from natural language description
```bash
planfirst plan "Add user authentication with JWT"
# Analyzes codebase
# Generates detailed plan with phases
# Saves plan to plans/ directory
# Outputs plan ID
```

### `planfirst plan --interactive`
Interactive plan generation with refinement
```bash
planfirst plan --interactive
# Asks clarifying questions
# Generates plan iteratively
# Allows user to refine before finalizing
```

### `planfirst export <plan-id> [--format=markdown|json|cursor]`
Export plan for use with coding agents
```bash
planfirst export plan-001 --format=cursor
# Exports plan in format optimized for specific agent
# Cursor, Claude Code, or generic markdown
```

### `planfirst verify <plan-id> [--phase=1]`
Verify implementation against plan
```bash
planfirst verify plan-001 --phase=1
# Compares current codebase against plan
# Detects differences
# Generates verification report
```

### `planfirst list`
List all plans
```bash
planfirst list
# Shows all generated plans with metadata
```

### `planfirst show <plan-id>`
Display a specific plan
```bash
planfirst show plan-001
# Displays plan details in terminal
```

---

## 6. KEY DIFFERENTIATORS

What makes our simplified version valuable:

1. **Lightweight**: CLI tool, no heavy IDE integration needed
2. **Agent Agnostic**: Works with any coding agent
3. **Transparent**: Plans are readable markdown/JSON files
4. **Version Control Friendly**: Plans can be committed to git
5. **Offline Capable**: Core analysis works without API (only plan generation needs LLM)
6. **Extensible**: Plugin architecture for custom analyzers/exporters

---

## 7. SUCCESS CRITERIA

### Functional Requirements:
- ✅ Analyze codebase structure
- ✅ Generate detailed implementation plans
- ✅ Export plans in multiple formats
- ✅ Verify implementation against plans
- ✅ Support multiple programming languages

### Code Quality:
- ✅ Clean, modular TypeScript code
- ✅ Comprehensive type definitions
- ✅ Error handling throughout
- ✅ Unit tests for core functions
- ✅ Clear documentation

### User Experience:
- ✅ Intuitive CLI commands
- ✅ Helpful error messages
- ✅ Fast execution (<5s for most operations)
- ✅ Clear, readable output
- ✅ Good documentation with examples

---

## 8. DEMO SCENARIO

To showcase the tool, we'll build this demo:

**Scenario**: "Add a REST API endpoint for user profile management"

**Flow**:
1. `planfirst init` - Initialize in a sample Express.js project
2. `planfirst plan "Add GET and PUT endpoints for /api/users/:id/profile"` - Generate plan
3. Show generated plan with:
   - Phase 1: Create route handlers
   - Phase 2: Add validation middleware
   - Phase 3: Update database models
   - Phase 4: Add tests
4. Simulate implementation using Claude Code
5. `planfirst verify plan-001` - Verify implementation
6. Show verification report highlighting matches and gaps

---

## 9. NEXT STEPS

1. ✅ Complete this planning document
2. → Set up project structure
3. → Implement core analyzer
4. → Integrate Claude API for plan generation
5. → Build verification system
6. → Create comprehensive documentation
7. → Record demo

---
