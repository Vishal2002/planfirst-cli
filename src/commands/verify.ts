import path from 'path';
import ora from 'ora';
import { VerifyOptions, Plan, VerificationResult } from '../types';
import { logger } from '../utils/logger';
import { exists, readJSON, writeFile, readFile } from '../utils/fileSystem';
import { Verifier } from '../core/verifier';

/**
 * Verify implementation against a plan
 */
export async function verifyCommand(
  planId: string,
  options: VerifyOptions
): Promise<void> {
  const rootPath = process.cwd();
  const configPath = path.join(rootPath, '.planfirst', 'config.json');

  logger.section('Verifying Implementation');

  // Check if initialized
  if (!(await exists(configPath))) {
    logger.error('PlanFirst is not initialized in this directory');
    logger.info('Run: planfirst init');
    process.exit(1);
  }

  const config = await readJSON(configPath);
  const plansDir = config.plansDirectory;

  // Load plan
  const planPath = path.join(plansDir, `${planId}.json`);
  
  if (!(await exists(planPath))) {
    logger.error(`Plan not found: ${planId}`);
    logger.info('Use: planfirst list - to see all plans');
    process.exit(1);
  }

  const plan: Plan = await readJSON(planPath);

  logger.info(`Plan: ${logger.highlight(plan.title)}`);
  if (options.phase) {
    logger.info(`Verifying Phase: ${logger.highlight(options.phase.toString())}`);
  }
  logger.newline();

  const spinner = ora('Analyzing current codebase...').start();

  try {
    // Run verification
    const result = await Verifier.verify(plan, rootPath, {
      phase: options.phase,
      task: options.task,
      strictMode: config.verification?.strictMode || false,
    });

    spinner.succeed('Verification complete');
    logger.newline();

    // Display results
    displayVerificationResults(result);

    // Save report if requested
    if (options.report) {
      await saveVerificationReport(result, options.report);
      logger.newline();
      logger.success(`Report saved to: ${options.report}`);
    }

    // Exit with appropriate code
    if (result.overallStatus === 'fail' || result.overallStatus === 'error') {
      process.exit(1);
    }

  } catch (error) {
    spinner.fail('Verification failed');
    throw error;
  }
}

/**
 * Display verification results
 */
function displayVerificationResults(result: VerificationResult): void {
  const statusEmoji = {
    pass: '✅',
    partial: '⚠️',
    fail: '❌',
    error: '🔥',
  };

  const statusColor = {
    pass: 'green',
    partial: 'yellow',
    fail: 'red',
    error: 'red',
  };

  logger.subsection('Verification Summary');
  logger.newline();

  // Overall status
  const emoji = statusEmoji[result.overallStatus];
  logger.log(`${emoji} Overall Status: ${logger.bold(result.overallStatus.toUpperCase())}`);
  logger.newline();

  // Summary stats
  logger.keyValue('Total Tasks', result.summary.totalTasks.toString(), 1);
  logger.keyValue('Completed', `${result.summary.tasksCompleted} ✓`, 1);
  logger.keyValue('Partial', `${result.summary.tasksPartial} ⚠`, 1);
  logger.keyValue('Missing', `${result.summary.tasksMissing} ✗`, 1);
  logger.newline();

  if (result.summary.criticalIssues > 0) {
    logger.keyValue('Critical Issues', result.summary.criticalIssues.toString(), 1);
  }
  if (result.summary.warnings > 0) {
    logger.keyValue('Warnings', result.summary.warnings.toString(), 1);
  }

  // Task results
  if (result.taskResults.length > 0) {
    logger.newline();
    logger.subsection('Task Details');
    
    result.taskResults.forEach(taskResult => {
      const taskEmoji = statusEmoji[taskResult.status];
      logger.item(`${taskEmoji} ${taskResult.file} (${Math.round(taskResult.matchPercentage)}% match)`, 1);
      
      if (taskResult.issues.length > 0 && taskResult.status !== 'pass') {
        taskResult.issues.forEach(issue => {
          const issueEmoji = issue.severity === 'critical' ? '🔥' : issue.severity === 'error' ? '❌' : '⚠️';
          logger.log(`      ${issueEmoji} ${issue.message}`);
        });
      }
    });
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    logger.newline();
    logger.subsection('Recommendations');
    result.recommendations.forEach(rec => {
      logger.item(rec, 1);
    });
  }

  logger.newline();
  logger.divider();
}

/**
 * Save verification report
 */
async function saveVerificationReport(
  result: VerificationResult,
  reportPath: string
): Promise<void> {
  let report = `# Verification Report\n\n`;
  report += `**Plan ID**: ${result.planId}\n`;
  report += `**Timestamp**: ${result.timestamp.toISOString()}\n`;
  report += `**Overall Status**: ${result.overallStatus.toUpperCase()}\n\n`;

  report += `## Summary\n\n`;
  report += `| Metric | Count |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Tasks | ${result.summary.totalTasks} |\n`;
  report += `| Completed | ${result.summary.tasksCompleted} |\n`;
  report += `| Partial | ${result.summary.tasksPartial} |\n`;
  report += `| Missing | ${result.summary.tasksMissing} |\n`;
  report += `| Critical Issues | ${result.summary.criticalIssues} |\n`;
  report += `| Warnings | ${result.summary.warnings} |\n\n`;

  if (result.taskResults.length > 0) {
    report += `## Task Results\n\n`;
    
    result.taskResults.forEach(taskResult => {
      const status = taskResult.status === 'pass' ? '✅' : 
                     taskResult.status === 'partial' ? '⚠️' : '❌';
      
      report += `### ${status} ${taskResult.file}\n\n`;
      report += `- **Status**: ${taskResult.status}\n`;
      report += `- **Match**: ${Math.round(taskResult.matchPercentage)}%\n`;
      report += `- **Task ID**: ${taskResult.taskId}\n\n`;

      if (taskResult.issues.length > 0) {
        report += `**Issues:**\n\n`;
        taskResult.issues.forEach(issue => {
          report += `- **[${issue.severity.toUpperCase()}]** ${issue.message}\n`;
          if (issue.line) {
            report += `  - Line: ${issue.line}\n`;
          }
          if (issue.suggestion) {
            report += `  - Suggestion: ${issue.suggestion}\n`;
          }
        });
        report += `\n`;
      }
    });
  }

  if (result.recommendations.length > 0) {
    report += `## Recommendations\n\n`;
    result.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });
    report += `\n`;
  }

  report += `---\n`;
  report += `*Generated by PlanFirst CLI on ${new Date().toLocaleString()}*\n`;

  await writeFile(reportPath, report);
}