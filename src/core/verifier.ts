import path from 'path';
import { Plan, VerificationResult, TaskVerification, Issue, VerificationStatus } from '../types';
import { exists, readFile, scanDirectory } from '../utils/fileSystem';
import { logger } from '../utils/logger';

/**
 * Verifier - Compares implementation against plans
 */

interface VerifyOptions {
  phase?: number;
  task?: string;
  strictMode?: boolean;
}

export class Verifier {
  /**
   * Verify implementation against plan
   */
  static async verify(
    plan: Plan,
    rootPath: string,
    options: VerifyOptions = {}
  ): Promise<VerificationResult> {
    logger.debug('Starting verification...');

    const taskResults: TaskVerification[] = [];
    const allIssues: Issue[] = [];

    // Determine which tasks to verify
    const tasksToVerify = this.getTasksToVerify(plan, options);

    // Verify each task
    for (const task of tasksToVerify) {
      const taskResult = await this.verifyTask(task, rootPath, options.strictMode || false);
      taskResults.push(taskResult);
      allIssues.push(...taskResult.issues);
    }

    // Calculate summary
    const summary = {
      totalTasks: taskResults.length,
      tasksCompleted: taskResults.filter(t => t.status === 'pass').length,
      tasksPartial: taskResults.filter(t => t.status === 'partial').length,
      tasksMissing: taskResults.filter(t => t.status === 'fail').length,
      criticalIssues: allIssues.filter(i => i.severity === 'critical' || i.severity === 'error').length,
      warnings: allIssues.filter(i => i.severity === 'warning').length,
    };

    // Determine overall status
    let overallStatus: VerificationStatus = 'pass';
    if (summary.criticalIssues > 0 || summary.tasksMissing > summary.totalTasks / 2) {
      overallStatus = 'fail';
    } else if (summary.tasksPartial > 0 || summary.tasksMissing > 0) {
      overallStatus = 'partial';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(taskResults, summary);

    const result: VerificationResult = {
      planId: plan.id,
      phaseId: options.phase ? `phase-${options.phase}` : undefined,
      timestamp: new Date(),
      overallStatus,
      taskResults,
      summary,
      recommendations,
    };

    return result;
  }

  /**
   * Get tasks to verify based on options
   */
  private static getTasksToVerify(plan: Plan, options: VerifyOptions): any[] {
    let tasks: any[] = [];

    if (options.phase) {
      // Verify specific phase
      const phase = plan.phases.find(p => p.order === options.phase);
      if (phase) {
        tasks = phase.tasks;
      }
    } else {
      // Verify all tasks
      plan.phases.forEach(phase => {
        tasks.push(...phase.tasks);
      });
    }

    // Filter by specific task if provided
    if (options.task) {
      tasks = tasks.filter(t => t.id === options.task);
    }

    return tasks;
  }

  /**
   * Verify a single task
   */
  private static async verifyTask(
    task: any,
    rootPath: string,
    strictMode: boolean
  ): Promise<TaskVerification> {
    const filePath = path.join(rootPath, task.file);
    const issues: Issue[] = [];
    let matchPercentage = 0;
    let status: VerificationStatus = 'fail';

    // Check if file exists
    const fileExists = await exists(filePath);

    if (task.type === 'create') {
      if (!fileExists) {
        issues.push({
          severity: 'error',
          type: 'missing-implementation',
          message: `File not created: ${task.file}`,
          file: task.file,
          suggestion: `Create the file as specified in the plan`,
        });
        status = 'fail';
        matchPercentage = 0;
      } else {
        // File was created
        const content = await readFile(filePath);
        matchPercentage = await this.calculateMatchPercentage(content, task);
        
        if (matchPercentage >= 80) {
          status = 'pass';
        } else if (matchPercentage >= 50) {
          status = 'partial';
          issues.push({
            severity: 'warning',
            type: 'incorrect-implementation',
            message: `File created but implementation may be incomplete (${Math.round(matchPercentage)}% match)`,
            file: task.file,
            suggestion: 'Review the plan and ensure all requirements are met',
          });
        } else {
          status = 'fail';
          issues.push({
            severity: 'error',
            type: 'incorrect-implementation',
            message: `File created but implementation is significantly different from plan`,
            file: task.file,
            suggestion: 'Review and align implementation with the plan',
          });
        }
      }
    } else if (task.type === 'modify') {
      if (!fileExists) {
        issues.push({
          severity: 'error',
          type: 'missing-implementation',
          message: `File does not exist: ${task.file}`,
          file: task.file,
          suggestion: task.file === 'unknown' ? 
            'This task may need clarification about which file to modify' :
            'Check if the file path is correct or if the file needs to be created',
        });
        status = 'fail';
        matchPercentage = 0;
      } else {
        // File exists, check modifications
        const content = await readFile(filePath);
        matchPercentage = await this.calculateMatchPercentage(content, task);
        
        if (matchPercentage >= 70) {
          status = 'pass';
        } else if (matchPercentage >= 40) {
          status = 'partial';
          issues.push({
            severity: 'warning',
            type: 'incorrect-implementation',
            message: `Modifications may be incomplete (${Math.round(matchPercentage)}% confidence)`,
            file: task.file,
            suggestion: 'Verify that all planned changes have been made',
          });
        } else {
          status = 'fail';
          issues.push({
            severity: 'error',
            type: 'missing-implementation',
            message: `Required modifications not detected`,
            file: task.file,
            suggestion: 'Review the plan and implement the required changes',
          });
        }
      }
    } else if (task.type === 'delete') {
      if (fileExists) {
        issues.push({
          severity: 'error',
          type: 'extra-changes',
          message: `File should have been deleted: ${task.file}`,
          file: task.file,
          suggestion: 'Remove this file as specified in the plan',
        });
        status = 'fail';
        matchPercentage = 0;
      } else {
        status = 'pass';
        matchPercentage = 100;
      }
    }

    // Check for unplanned changes in strict mode
    if (strictMode && fileExists) {
      const unplannedChanges = await this.detectUnplannedChanges(filePath, task);
      if (unplannedChanges.length > 0) {
        unplannedChanges.forEach(change => {
          issues.push({
            severity: 'warning',
            type: 'extra-changes',
            message: change,
            file: task.file,
          });
        });
      }
    }

    return {
      taskId: task.id,
      file: task.file,
      status,
      issues,
      matchPercentage,
    };
  }

  /**
   * Calculate match percentage based on task requirements
   */
  private static async calculateMatchPercentage(
    content: string,
    task: any
  ): Promise<number> {
    let score = 50; // Base score for file existence

    // Check if task description keywords are in the file
    const keywords = this.extractKeywords(task.description);
    const keywordsFound = keywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    score += (keywordsFound.length / Math.max(keywords.length, 1)) * 30;

    // Check for code patterns if changes were specified
    if (task.changes && task.changes.length > 0) {
      let changesFound = 0;
      task.changes.forEach((change: any) => {
        if (change.code) {
          // Check if similar code patterns exist
          const codeKeywords = this.extractKeywords(change.code);
          const found = codeKeywords.some(kw => content.includes(kw));
          if (found) changesFound++;
        }
      });
      score += (changesFound / task.changes.length) * 20;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Extract keywords from text
   */
  private static extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful terms
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
      'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'could', 'this', 'that', 'these', 'those', 'file', 'function', 'class',
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  /**
   * Detect unplanned changes
   */
  private static async detectUnplannedChanges(
    filePath: string,
    task: any
  ): Promise<string[]> {
    const changes: string[] = [];
    
    // This is a simplified implementation
    // In a real system, you would:
    // 1. Compare against a git diff
    // 2. Use AST parsing to detect structural changes
    // 3. Check for unexpected imports/exports
    
    // For now, just return an empty array
    return changes;
  }

  /**
   * Generate recommendations based on verification results
   */
  private static generateRecommendations(
    taskResults: TaskVerification[],
    summary: any
  ): string[] {
    const recommendations: string[] = [];

    if (summary.tasksMissing > 0) {
      recommendations.push(
        `Complete the ${summary.tasksMissing} missing task${summary.tasksMissing > 1 ? 's' : ''}`
      );
    }

    if (summary.tasksPartial > 0) {
      recommendations.push(
        `Review and improve the ${summary.tasksPartial} partially implemented task${summary.tasksPartial > 1 ? 's' : ''}`
      );
    }

    if (summary.criticalIssues > 0) {
      recommendations.push('Address critical issues before proceeding');
    }

    // Specific file recommendations
    const failedTasks = taskResults.filter(t => t.status === 'fail');
    if (failedTasks.length > 0 && failedTasks.length <= 3) {
      failedTasks.forEach(task => {
        recommendations.push(`Review implementation of ${task.file}`);
      });
    }

    if (recommendations.length === 0) {
      recommendations.push('Implementation looks good! Consider code review before merging');
    }

    return recommendations;
  }
}