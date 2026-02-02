import path from 'path';
import {
  Project,
  FileTree,
  AnalysisResult,
  CodeInsight,
  ComplexityMetrics,
} from '../types';
import {
  scanDirectory,
  detectProjectType,
  readPackageJson,
  getTotalLines,
  readFile,
  exists,
} from '../utils/fileSystem';
import { logger } from '../utils/logger';

/**
 * Codebase Analyzer - Understands project structure and provides insights
 */

export class CodebaseAnalyzer {
  private rootPath: string;
  private excludePatterns: string[];

  constructor(rootPath: string, excludePatterns: string[] = []) {
    this.rootPath = rootPath;
    this.excludePatterns = excludePatterns;
  }

  /**
   * Analyze the entire codebase
   */
  async analyze(): Promise<AnalysisResult> {
    logger.debug('Starting codebase analysis...');

    const project = await this.analyzeProject();
    const insights = await this.generateInsights(project);
    const complexity = await this.calculateComplexity(project);
    const recommendations = this.generateRecommendations(project, insights);

    return {
      project,
      insights,
      recommendations,
      complexity,
    };
  }

  /**
   * Analyze project structure
   */
  private async analyzeProject(): Promise<Project> {
    const packageJson = await readPackageJson(this.rootPath);
    const projectType = await detectProjectType(this.rootPath);
    const fileTree = await scanDirectory(this.rootPath, this.excludePatterns);

    const project: Project = {
      name: packageJson?.name || path.basename(this.rootPath),
      rootPath: this.rootPath,
      language: projectType.language,
      framework: projectType.framework,
      packageManager: projectType.packageManager,
      structure: fileTree,
      dependencies: Object.keys(packageJson?.dependencies || {}),
      devDependencies: Object.keys(packageJson?.devDependencies || {}),
    };

    return project;
  }

  /**
   * Generate insights about the codebase
   */
  private async generateInsights(project: Project): Promise<CodeInsight[]> {
    const insights: CodeInsight[] = [];

    // Architecture insights
    const hasSourceDir = 'src' in project.structure;
    if (!hasSourceDir) {
      insights.push({
        type: 'architecture',
        file: '/',
        message: 'No "src" directory found. Consider organizing code in a src/ directory.',
        severity: 'suggestion',
      });
    }

    // Check for tests
    const hasTests = Object.keys(project.structure).some(
      path => path.includes('test') || path.includes('spec')
    );
    if (!hasTests) {
      insights.push({
        type: 'quality',
        file: '/',
        message: 'No test files detected. Consider adding tests for better code quality.',
        severity: 'warning',
      });
    }

    // Check for TypeScript config
    if (project.language === 'typescript') {
      const hasTsConfig = await exists(path.join(this.rootPath, 'tsconfig.json'));
      if (!hasTsConfig) {
        insights.push({
          type: 'architecture',
          file: '/',
          message: 'TypeScript project missing tsconfig.json',
          severity: 'warning',
        });
      }
    }

    // Check for documentation
    const hasReadme = await exists(path.join(this.rootPath, 'README.md'));
    if (!hasReadme) {
      insights.push({
        type: 'quality',
        file: '/',
        message: 'No README.md found. Documentation is important for project understanding.',
        severity: 'info',
      });
    }

    // Dependency insights
    if (project.dependencies.length > 50) {
      insights.push({
        type: 'dependency',
        file: 'package.json',
        message: `Large number of dependencies (${project.dependencies.length}). Consider auditing for unused packages.`,
        severity: 'info',
      });
    }

    return insights;
  }

  /**
   * Calculate complexity metrics
   */
  private async calculateComplexity(project: Project): Promise<ComplexityMetrics> {
    const files = Object.entries(project.structure).filter(
      ([_, node]) => node.type === 'file'
    );

    const totalFiles = files.length;
    const totalSize = files.reduce((sum, [_, node]) => sum + (node.size || 0), 0);
    const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;

    // Calculate total lines for code files
    let totalLines = 0;
    try {
      totalLines = await getTotalLines(this.rootPath);
    } catch (error) {
      logger.debug('Failed to calculate total lines:', error);
    }

    // Calculate dependency depth (simplified)
    const dependencyDepth = this.calculateDependencyDepth(project);

    return {
      totalFiles,
      totalLines,
      averageFileSize,
      dependencyDepth,
    };
  }

  /**
   * Calculate dependency depth
   */
  private calculateDependencyDepth(project: Project): number {
    // Simplified: just return the count of direct dependencies
    // In a real implementation, this would analyze the dependency tree
    return project.dependencies.length + project.devDependencies.length;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    project: Project,
    insights: CodeInsight[]
  ): string[] {
    const recommendations: string[] = [];

    // Framework-specific recommendations
    if (project.framework === 'react') {
      recommendations.push(
        'Consider using React hooks for state management',
        'Implement code splitting for better performance'
      );
    } else if (project.framework === 'express') {
      recommendations.push(
        'Implement proper error handling middleware',
        'Consider using input validation (e.g., Joi, Zod)'
      );
    }

    // Language-specific recommendations
    if (project.language === 'typescript') {
      recommendations.push(
        'Enable strict mode in tsconfig.json for better type safety',
        'Use type definitions for all external dependencies'
      );
    }

    // Add recommendations based on insights
    const warningCount = insights.filter(i => i.severity === 'warning').length;
    if (warningCount > 0) {
      recommendations.push(
        `Address ${warningCount} warning${warningCount > 1 ? 's' : ''} to improve code quality`
      );
    }

    return recommendations;
  }

  /**
   * Get file summary for AI context
   */
  async getFileSummary(maxFiles: number = 50): Promise<string> {
    const project = await this.analyzeProject();
    const files = Object.entries(project.structure)
      .filter(([_, node]) => node.type === 'file')
      .slice(0, maxFiles);

    let summary = `# Project: ${project.name}\n\n`;
    summary += `Language: ${project.language}\n`;
    if (project.framework) {
      summary += `Framework: ${project.framework}\n`;
    }
    summary += `\n## File Structure:\n\n`;

    files.forEach(([filePath, node]) => {
      summary += `- ${filePath}`;
      if (node.language && node.language !== 'unknown') {
        summary += ` (${node.language})`;
      }
      summary += '\n';
    });

    summary += `\n## Dependencies:\n`;
    if (project.dependencies.length > 0) {
      summary += project.dependencies.slice(0, 20).join(', ');
      if (project.dependencies.length > 20) {
        summary += ` ... and ${project.dependencies.length - 20} more`;
      }
    }

    return summary;
  }

  /**
   * Read specific files for context
   */
  async getFileContents(filePaths: string[]): Promise<Map<string, string>> {
    const contents = new Map<string, string>();

    for (const filePath of filePaths) {
      try {
        const fullPath = path.join(this.rootPath, filePath);
        if (await exists(fullPath)) {
          const content = await readFile(fullPath);
          contents.set(filePath, content);
        }
      } catch (error) {
        logger.debug(`Failed to read file ${filePath}:`, error);
      }
    }

    return contents;
  }

  /**
   * Find related files based on a file path
   */
  async findRelatedFiles(filePath: string, maxResults: number = 10): Promise<string[]> {
    const project = await this.analyzeProject();
    const related: string[] = [];

    const baseName = path.basename(filePath, path.extname(filePath));
    const dirName = path.dirname(filePath);

    // Find files in the same directory
    Object.keys(project.structure).forEach(file => {
      if (
        file !== filePath &&
        path.dirname(file) === dirName &&
        related.length < maxResults
      ) {
        related.push(file);
      }
    });

    // Find files with similar names
    if (related.length < maxResults) {
      Object.keys(project.structure).forEach(file => {
        if (
          file !== filePath &&
          !related.includes(file) &&
          file.includes(baseName) &&
          related.length < maxResults
        ) {
          related.push(file);
        }
      });
    }

    return related;
  }
}

/**
 * Helper function to create and run analyzer
 */
export async function analyzeCodebase(
  rootPath: string,
  excludePatterns?: string[]
): Promise<AnalysisResult> {
  const analyzer = new CodebaseAnalyzer(rootPath, excludePatterns);
  return await analyzer.analyze();
}