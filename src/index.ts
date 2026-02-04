#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { logger } from './utils/logger';
import { initCommand } from './commands/init';
import { planCommand } from './commands/plan';
import { verifyCommand } from './commands/verify';
import { exportCommand } from './commands/export';
import path from 'path';
import { exists, readJSON} from './utils/fileSystem';

/**
 * PlanFirst CLI - A planning layer for AI coding agents
 */

const program = new Command();

// ASCII Art Banner
const banner = `
${chalk.cyan('╔══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                          ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.white('██████╗ ██╗      █████╗ ███╗   ██╗███████╗██╗██████╗ ███████╗████████╗')}   ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.white('██╔══██╗██║     ██╔══██╗████╗  ██║██╔════╝██║██╔══██╗██╔════╝╚══██╔══╝')}   ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.white('██████╔╝██║     ███████║██╔██╗ ██║█████╗  ██║██████╔╝███████╗   ██║   ')}   ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.white('██╔═══╝ ██║     ██╔══██║██║╚██╗██║██╔══╝  ██║██╔══██╗╚════██║   ██║   ')}   ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.white('██║     ███████╗██║  ██║██║ ╚████║██║     ██║██║  ██║███████║   ██║   ')}   ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.white('╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ')}   ${chalk.cyan('║')}
${chalk.cyan('║')}                                                          ${chalk.cyan('║')}
${chalk.cyan('║')}              ${chalk.yellow('Planning Layer for AI Coding Agents')}              ${chalk.cyan('║')}
${chalk.cyan('║')}                                                          ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════╝')}
`;

// CLI Configuration
program
  .name('planfirst')
  .description('A planning layer for AI coding agents - turns intent into detailed, verifiable implementation plans')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress all output except errors')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    
    if (options.verbose) {
      logger.setLevel('debug');
    } else if (options.quiet) {
      logger.setSilent(true);
    }
  });

// Init Command
program
  .command('init')
  .description('Initialize PlanFirst in the current project')
  .option('-n, --name <name>', 'Project name')
  .option('--skip-analysis', 'Skip initial codebase analysis')
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      logger.error('Initialization failed', error);
      process.exit(1);
    }
  });

// Plan Command
program
  .command('plan')
  .description('Generate an implementation plan from a description')
  .argument('[description]', 'What you want to build')
  .option('-i, --interactive', 'Interactive mode with clarifying questions')
  .option('-o, --output <path>', 'Output path for the plan')
  .option('-f, --format <format>', 'Output format (markdown, json)', 'markdown')
  .option('--auto-breakdown', 'Automatically break down into phases', true)
  .action(async (description, options) => {
    try {
      if (!description && !options.interactive) {
        logger.error('Please provide a description or use --interactive mode');
        logger.info('Example: planfirst plan "Add user authentication with JWT"');
        process.exit(1);
      }
      await planCommand(description, options);
    } catch (error) {
      logger.error('Plan generation failed', error);
      process.exit(1);
    }
  });

// Verify Command
program
  .command('verify')
  .description('Verify implementation against a plan')
  .argument('<plan-id>', 'Plan ID to verify against')
  .option('-p, --phase <number>', 'Verify specific phase only')
  .option('-t, --task <id>', 'Verify specific task only')
  .option('--fix', 'Attempt to auto-fix issues', false)
  .option('-r, --report <path>', 'Save verification report to file')
  .action(async (planId, options) => {
    try {
      await verifyCommand(planId, options);
    } catch (error) {
      logger.error('Verification failed', error);
      process.exit(1);
    }
  });

// Export Command
program
  .command('export')
  .description('Export a plan for use with coding agents')
  .argument('<plan-id>', 'Plan ID to export')
  .option('-f, --format <format>', 'Export format (markdown, json, cursor)', 'markdown')
  .option('-o, --output <path>', 'Output file path')
  .option('-p, --phase <number>', 'Export specific phase only')
  .action(async (planId, options) => {
    try {
      await exportCommand(planId, options);
    } catch (error) {
      logger.error('Export failed', error);
      process.exit(1);
    }
  });

// List Command
program
  .command('list')
  .description('List all plans')
  .option('-s, --status <status>', 'Filter by status (draft, ready, in-progress, completed)')
  .action(async (options) => {
    try {
      const path = require('path');
      const { readdir, readJSON } = require('../utils/fileSystem');
      
      const rootPath = process.cwd();
      const configPath = path.join(rootPath, '.planfirst', 'config.json');
      
      if (!(await require('../utils/fileSystem').exists(configPath))) {
        logger.error('PlanFirst is not initialized');
        logger.info('Run: planfirst init');
        process.exit(1);
      }
      
      const config = await readJSON(configPath);
      const plansDir = config.plansDirectory;
      
      const files = await readdir(plansDir);
      const planFiles = files.filter((f: string) => f.endsWith('.json'));
      
      if (planFiles.length === 0) {
        logger.info('No plans found');
        logger.info('Create one with: planfirst plan "Your task"');
        return;
      }
      
      logger.section('Plans');
      
      const plans = [];
      for (const file of planFiles) {
        const plan = await readJSON(path.join(plansDir, file));
        if (!options.status || plan.status === options.status) {
          plans.push(plan);
        }
      }
      
      if (plans.length === 0) {
        logger.info(`No plans with status: ${options.status}`);
        return;
      }
      
      const headers = ['Plan ID', 'Title', 'Phases', 'Status', 'Created'];
      const rows = plans.map((p: any) => [
        p.id,
        p.title.slice(0, 40) + (p.title.length > 40 ? '...' : ''),
        p.phases.length.toString(),
        p.status,
        new Date(p.timestamp).toLocaleDateString(),
      ]);
      
      logger.table(headers, rows);
      logger.newline();
      logger.info(`Total: ${plans.length} plan${plans.length > 1 ? 's' : ''}`);
      logger.newline();
      
    } catch (error) {
      logger.error('List failed', error);
      process.exit(1);
    }
  });

// Show Command
program
  .command('show')
  .description('Display details of a specific plan')
  .argument('<plan-id>', 'Plan ID to display')
  .option('-p, --phase <number>', 'Show specific phase only')
  .action(async (planId, options) => {
    try {
      const path = require('path');
      const { exists, readJSON } = require('../utils/fileSystem');
      
      const rootPath = process.cwd();
      const configPath = path.join(rootPath, '.planfirst', 'config.json');
      
      if (!(await exists(configPath))) {
        logger.error('PlanFirst is not initialized');
        process.exit(1);
      }
      
      const config = await readJSON(configPath);
      const planPath = path.join(config.plansDirectory, `${planId}.json`);
      
      if (!(await exists(planPath))) {
        logger.error(`Plan not found: ${planId}`);
        logger.info('Use: planfirst list - to see all plans');
        process.exit(1);
      }
      
      const plan = await readJSON(planPath);
      
      logger.section(plan.title);
      logger.log(plan.description);
      logger.newline();
      
      logger.subsection('Plan Information');
      logger.keyValue('Plan ID', plan.id, 1);
      logger.keyValue('Created', new Date(plan.timestamp).toLocaleString(), 1);
      logger.keyValue('Status', plan.status, 1);
      logger.keyValue('Complexity', plan.metadata.estimatedComplexity, 1);
      logger.keyValue('Estimated Time', plan.metadata.estimatedTime || 'N/A', 1);
      logger.keyValue('Files Affected', plan.metadata.filesAffected.length.toString(), 1);
      logger.newline();
      
      if (options.phase) {
        const phaseNum = parseInt(options.phase);
        if (phaseNum > 0 && phaseNum <= plan.phases.length) {
          const phase = plan.phases[phaseNum - 1];
          displayPhase(phase, phaseNum);
        } else {
          logger.error(`Invalid phase: ${phaseNum}`);
          logger.info(`Plan has ${plan.phases.length} phases`);
        }
      } else {
        logger.subsection('Phases');
        plan.phases.forEach((phase: any, idx: number) => {
          logger.item(`Phase ${idx + 1}: ${phase.name}`, 1);
          logger.log(`   ${phase.description.slice(0, 100)}...`);
          logger.log(`   Tasks: ${phase.tasks.length}`);
          logger.newline();
        });
      }
      
      logger.subsection('Files');
      plan.metadata.filesAffected.slice(0, 10).forEach((file: string) => {
        logger.item(file, 1);
      });
      if (plan.metadata.filesAffected.length > 10) {
        logger.log(`   ... and ${plan.metadata.filesAffected.length - 10} more`);
      }
      logger.newline();
      
    } catch (error) {
      logger.error('Show failed', error);
      process.exit(1);
    }
  });

function displayPhase(phase: any, phaseNum: number) {
  logger.subsection(`Phase ${phaseNum}: ${phase.name}`);
  logger.log(phase.description);
  logger.newline();
  
  logger.subsection('Tasks');
  phase.tasks.forEach((task: any, idx: number) => {
    logger.item(`${idx + 1}. ${task.description}`, 1);
    logger.log(`   File: ${task.file}`);
    logger.log(`   Type: ${task.type}`);
    logger.log(`   Reasoning: ${task.reasoning}`);
    logger.newline();
  });
}

// Config Command
program
  .command('config')
  .description('Configure PlanFirst settings')
  .option('-s, --set <key=value>', 'Set a configuration value')
  .option('-g, --get <key>', 'Get a configuration value')
  .option('-l, --list', 'List all configuration')
  .action(async (options) => {
    try {
      // TODO: Implement config command
      logger.info('Managing configuration...');
      logger.warn('This command is not yet implemented');
    } catch (error) {
      logger.error('Config failed', error);
      process.exit(1);
    }
  });

// Help Examples
program.on('--help', () => {
  console.log('');
  console.log(chalk.bold.cyan('📚 Examples:'));
  console.log('');
  console.log(chalk.gray('  Initialize PlanFirst in your project:'));
  console.log(chalk.white('  $ planfirst init'));
  console.log('');
  console.log(chalk.gray('  Generate a plan from description:'));
  console.log(chalk.white('  $ planfirst plan "Add user authentication with JWT"'));
  console.log('');
  console.log(chalk.gray('  Generate plan interactively:'));
  console.log(chalk.white('  $ planfirst plan --interactive'));
  console.log('');
  console.log(chalk.gray('  Verify implementation:'));
  console.log(chalk.white('  $ planfirst verify plan-001'));
  console.log('');
  console.log(chalk.gray('  Export plan for Cursor:'));
  console.log(chalk.white('  $ planfirst export plan-001 --format cursor'));
  console.log('');
  console.log(chalk.gray('  List all plans:'));
  console.log(chalk.white('  $ planfirst list'));
  console.log('');
  console.log(chalk.bold.cyan('🔧 Quick Setup:'));
  console.log('');
  console.log(chalk.gray('  1. Set your API key (choose one):'));
  console.log(chalk.white('     export OPENAI_API_KEY=your_key'));
  console.log(chalk.dim('     or'));
  console.log(chalk.white('     export ANTHROPIC_API_KEY=your_key'));
  console.log('');
  console.log(chalk.gray('  2. Initialize:'));
  console.log(chalk.white('     planfirst init'));
  console.log('');
  console.log(chalk.gray('  3. Create your first plan:'));
  console.log(chalk.white('     planfirst plan "Your task description"'));
  console.log('');
  console.log(chalk.bold.cyan('📖 Documentation:'));
  console.log(chalk.white('  https://github.com/yourusername/planfirst-cli'));
  console.log('');
  console.log(chalk.bold.cyan('💡 Tip:'));
  console.log(chalk.gray('  Use --verbose flag for detailed output'));
  console.log(chalk.gray('  Check API_SETUP.md for API configuration help'));
  console.log('');
});

// Error handling
program.exitOverride();

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', error);
  process.exit(1);
});

// Parse arguments
if (process.argv.length === 2) {
  console.log(banner);
  program.help();
} else {
  program.parse(process.argv);
}