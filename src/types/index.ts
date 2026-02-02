/**
 * Core type definitions for PlanFirst CLI
 */

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
    name: string;
    rootPath: string;
    language: string;
    framework?: string;
    packageManager?: 'npm' | 'yarn' | 'pnpm';
    structure: FileTree;
    dependencies: string[];
    devDependencies: string[];
  }
  
  export interface FileTree {
    [path: string]: FileNode;
  }
  
  export interface FileNode {
    type: 'file' | 'directory';
    size?: number;
    language?: string;
    extension?: string;
    dependencies?: string[];
    exports?: string[];
    imports?: string[];
  }
  
  // ============================================================================
  // Plan Types
  // ============================================================================
  
  export interface Plan {
    id: string;
    title: string;
    description: string;
    timestamp: Date;
    phases: Phase[];
    metadata: PlanMetadata;
    status: PlanStatus;
  }
  
  export interface PlanMetadata {
    estimatedComplexity: 'low' | 'medium' | 'high';
    filesAffected: string[];
    dependencies: string[];
    estimatedTime?: string;
    tags?: string[];
  }
  
  export type PlanStatus = 'draft' | 'ready' | 'in-progress' | 'completed' | 'verified';
  
  export interface Phase {
    id: string;
    order: number;
    name: string;
    description: string;
    tasks: Task[];
    dependencies: string[]; // Phase IDs this phase depends on
    status: PhaseStatus;
  }
  
  export type PhaseStatus = 'pending' | 'in-progress' | 'completed' | 'failed';
  
  export interface Task {
    id: string;
    type: TaskType;
    file: string;
    description: string;
    reasoning: string;
    changes: Change[];
    dependencies?: string[]; // Task IDs this task depends on
  }
  
  export type TaskType = 'create' | 'modify' | 'delete' | 'rename' | 'move';
  
  export interface Change {
    location: string; // Function name, class name, or line range (e.g., "lines 10-20")
    action: ChangeAction;
    description: string;
    code?: string;
    rationale: string;
  }
  
  export type ChangeAction = 
    | 'add'
    | 'modify'
    | 'delete'
    | 'replace'
    | 'refactor'
    | 'comment';
  
  // ============================================================================
  // Verification Types
  // ============================================================================
  
  export interface VerificationResult {
    planId: string;
    phaseId?: string;
    timestamp: Date;
    overallStatus: VerificationStatus;
    taskResults: TaskVerification[];
    summary: VerificationSummary;
    recommendations: string[];
  }
  
  export type VerificationStatus = 'pass' | 'partial' | 'fail' | 'error';
  
  export interface TaskVerification {
    taskId: string;
    file: string;
    status: VerificationStatus;
    issues: Issue[];
    matchPercentage: number;
  }
  
  export interface VerificationSummary {
    totalTasks: number;
    tasksCompleted: number;
    tasksPartial: number;
    tasksMissing: number;
    criticalIssues: number;
    warnings: number;
  }
  
  export interface Issue {
    severity: IssueSeverity;
    type: IssueType;
    message: string;
    file: string;
    line?: number;
    suggestion?: string;
  }
  
  export type IssueSeverity = 'critical' | 'error' | 'warning' | 'info';
  
  export type IssueType =
    | 'missing-implementation'
    | 'incorrect-implementation'
    | 'regression'
    | 'extra-changes'
    | 'dependency-issue'
    | 'syntax-error'
    | 'logic-error';
  
  // ============================================================================
  // Configuration Types
  // ============================================================================
  
  export interface PlanFirstConfig {
    version: string;
    projectRoot: string;
    plansDirectory: string;
    cacheDirectory: string;
    excludePatterns: string[];
    includePatterns?: string[];
    ai: AIConfig;
    verification: VerificationConfig;
  }
  
  export interface AIConfig {
    provider: 'anthropic' | 'openai' | 'custom';
    model: string;
    apiKey?: string;
    maxTokens?: number;
    temperature?: number;
  }
  
  export interface VerificationConfig {
    strictMode: boolean;
    ignoreWarnings: boolean;
    autoFix: boolean;
    diffTool?: string;
  }
  
  // ============================================================================
  // CLI Types
  // ============================================================================
  
  export interface CLIOptions {
    verbose?: boolean;
    quiet?: boolean;
    force?: boolean;
    dryRun?: boolean;
    config?: string;
  }
  
  export interface InitOptions extends CLIOptions {
    name?: string;
    skipAnalysis?: boolean;
  }
  
  export interface PlanOptions extends CLIOptions {
    interactive?: boolean;
    output?: string;
    format?: ExportFormat;
    phase?: number;
    autoBreakdown?: boolean;
  }
  
  export interface VerifyOptions extends CLIOptions {
    phase?: number;
    task?: string;
    fix?: boolean;
    report?: string;
  }
  
  export interface ExportOptions extends CLIOptions {
    format: ExportFormat;
    output?: string;
    phase?: number;
  }
  
  export type ExportFormat = 'markdown' | 'json' | 'yaml' | 'cursor' | 'html';
  
  // ============================================================================
  // Analyzer Types
  // ============================================================================
  
  export interface AnalysisResult {
    project: Project;
    insights: CodeInsight[];
    recommendations: string[];
    complexity: ComplexityMetrics;
  }
  
  export interface CodeInsight {
    type: InsightType;
    file: string;
    line?: number;
    message: string;
    severity: 'info' | 'suggestion' | 'warning';
  }
  
  export type InsightType =
    | 'architecture'
    | 'pattern'
    | 'dependency'
    | 'quality'
    | 'performance'
    | 'security';
  
  export interface ComplexityMetrics {
    totalFiles: number;
    totalLines: number;
    averageFileSize: number;
    dependencyDepth: number;
    cyclomaticComplexity?: number;
  }
  
  // ============================================================================
  // AI/LLM Types
  // ============================================================================
  
  export interface AIRequest {
    prompt: string;
    context?: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }
  
  export interface AIResponse {
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
  }
  
  // ============================================================================
  // Logger Types
  // ============================================================================
  
  export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';
  
  export interface LoggerOptions {
    level: LogLevel;
    silent?: boolean;
    timestamp?: boolean;
  }
  
  // ============================================================================
  // Utility Types
  // ============================================================================
  
  export interface FileStats {
    path: string;
    size: number;
    created: Date;
    modified: Date;
    isDirectory: boolean;
    extension?: string;
  }
  
  export interface DiffResult {
    added: string[];
    removed: string[];
    modified: string[];
    unchanged: string[];
  }
  
  export interface TemplateData {
    [key: string]: any;
  }
  
  // ============================================================================
  // Error Types
  // ============================================================================
  
  export class PlanFirstError extends Error {
    constructor(
      message: string,
      public code: string,
      public details?: any
    ) {
      super(message);
      this.name = 'PlanFirstError';
    }
  }
  
  export class FileSystemError extends PlanFirstError {
    constructor(message: string, details?: any) {
      super(message, 'FS_ERROR', details);
      this.name = 'FileSystemError';
    }
  }
  
  export class ParsingError extends PlanFirstError {
    constructor(message: string, details?: any) {
      super(message, 'PARSE_ERROR', details);
      this.name = 'ParsingError';
    }
  }
  
  export class AIError extends PlanFirstError {
    constructor(message: string, details?: any) {
      super(message, 'AI_ERROR', details);
      this.name = 'AIError';
    }
  }
  
  export class ConfigError extends PlanFirstError {
    constructor(message: string, details?: any) {
      super(message, 'CONFIG_ERROR', details);
      this.name = 'ConfigError';
    }
  }