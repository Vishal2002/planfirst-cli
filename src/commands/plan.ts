import path from 'path';
import ora from 'ora';
import { PlanOptions, Plan } from '../types';
import { logger } from '../utils/logger';
import { exists, readJSON, writeFile, writeJSON, ensureDir } from '../utils/fileSystem';
import { CodebaseAnalyzer } from '../core/analyzer';
import { createAIClient, isAPIKeyConfigured } from '../utils/ai';
import { Planner } from '../core/planner';

/**
 * Generate an implementation plan
 */
export async function planCommand(
  description: string,
  options: PlanOptions
): Promise<void> {
  const rootPath = process.cwd();
  const configPath = path.join(rootPath, '.planfirst', 'config.json');

  logger.section('Generating Implementation Plan');

  // Check if PlanFirst is initialized
  if (!(await exists(configPath))) {
    logger.error('PlanFirst is not initialized in this directory');
    logger.info('Run: planfirst init');
    process.exit(1);
  }

  // Check API key
  if (!isAPIKeyConfigured()) {
    logger.error('ANTHROPIC_API_KEY not found');
    logger.info('Set it with: export ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }

  // Load configuration
  const config = await readJSON(configPath);
  const plansDir = config.plansDirectory;
  await ensureDir(plansDir);

  let spinner = ora('Analyzing codebase...').start();

  try {
    // Analyze codebase
    const analyzer = new CodebaseAnalyzer(rootPath, config.excludePatterns);
    const analysis = await analyzer.analyze();
    
    spinner.succeed('Codebase analyzed');
    logger.newline();
    
    // Display project info
    logger.subsection('Project Information');
    logger.keyValue('Name', analysis.project.name, 1);
    logger.keyValue('Language', analysis.project.language, 1);
    if (analysis.project.framework) {
      logger.keyValue('Framework', analysis.project.framework, 1);
    }
    logger.keyValue('Total Files', analysis.complexity.totalFiles.toString(), 1);
    logger.keyValue('Total Lines', analysis.complexity.totalLines.toString(), 1);
    logger.newline();

    // Generate context for AI
    spinner = ora('Generating plan with AI...').start();
    const context = await analyzer.getFileSummary();

    // Call AI to generate plan
    const aiClient = createAIClient(config.ai);
    const planMarkdown = await aiClient.generatePlan(description, context);
    
    spinner.succeed('Plan generated');
    logger.newline();

    // Parse plan into structured format
    spinner = ora('Processing plan...').start();
    const plan = Planner.parsePlanFromMarkdown(planMarkdown, description, analysis);
    
    // Save plan
    const planId = plan.id;
    const planPath = path.join(plansDir, `${planId}.json`);
    const planMarkdownPath = path.join(plansDir, `${planId}.md`);
    
    await writeJSON(planPath, plan);
    await writeFile(planMarkdownPath, planMarkdown);
    
    spinner.succeed('Plan saved');
    logger.newline();

    // Display summary
    logger.success('Plan generated successfully! 🎉');
    logger.newline();

    logger.subsection('Plan Summary');
    logger.keyValue('Plan ID', logger.highlight(planId), 1);
    logger.keyValue('Title', plan.title, 1);
    logger.keyValue('Phases', plan.phases.length.toString(), 1);
    logger.keyValue('Complexity', plan.metadata.estimatedComplexity, 1);
    logger.keyValue('Files Affected', plan.metadata.filesAffected.length.toString(), 1);
    logger.newline();

    logger.subsection('Phases');
    plan.phases.forEach((phase, idx) => {
      logger.item(`${idx + 1}. ${phase.name} (${phase.tasks.length} tasks)`, 1);
    });
    logger.newline();

    logger.subsection('Saved Files');
    logger.item(`JSON: ${planPath}`, 1);
    logger.item(`Markdown: ${planMarkdownPath}`, 1);
    logger.newline();

    logger.subsection('Next Steps');
    logger.item(`View the plan: cat ${planMarkdownPath}`, 1);
    logger.item(`Export for agent: planfirst export ${planId}`, 1);
    logger.item(`After implementation: planfirst verify ${planId}`, 1);
    logger.newline();

  } catch (error) {
    spinner.fail('Plan generation failed');
    throw error;
  }
}