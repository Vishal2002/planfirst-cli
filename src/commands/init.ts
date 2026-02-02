import path from 'path';
import ora from 'ora';
import { logger } from '../utils/logger';
import { 
  exists, 
  writeJSON, 
  ensureDir, 
  detectProjectType,
  readPackageJson,
  scanDirectory 
} from '../utils/fileSystem';
import { PlanFirstConfig, InitOptions } from '../types';

/**
 * Initialize PlanFirst in the current project
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const rootPath = process.cwd();
  const configDir = path.join(rootPath, '.planfirst');
  const configPath = path.join(configDir, 'config.json');
  const plansDir = path.join(rootPath, 'plans');

  logger.section('Initializing PlanFirst');

  // Check if already initialized
  if (await exists(configPath)) {
    logger.warn('PlanFirst is already initialized in this directory');
    const shouldContinue = true; // In a real app, you'd prompt the user
    if (!shouldContinue) {
      return;
    }
    logger.info('Reinitializing...');
  }

  // Detect project information
  const spinner = ora('Analyzing project...').start();
  
  try {
    const packageJson = await readPackageJson(rootPath);
    const projectType = await detectProjectType(rootPath);
    
    const projectName = options.name || packageJson?.name || path.basename(rootPath);

    spinner.text = 'Detecting project structure...';

    // Scan directory if not skipped
    let fileCount = 0;
    if (!options.skipAnalysis) {
      const fileTree = await scanDirectory(rootPath);
      fileCount = Object.keys(fileTree).filter(k => fileTree[k].type === 'file').length;
    }

    spinner.text = 'Creating configuration...';

    // Create directories
    await ensureDir(configDir);
    await ensureDir(plansDir);
    await ensureDir(path.join(configDir, 'cache'));

    // Create configuration
    const config: PlanFirstConfig = {
      version: '0.1.0',
      projectRoot: rootPath,
      plansDirectory: plansDir,
      cacheDirectory: path.join(configDir, 'cache'),
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
      ],
      ai: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        maxTokens: 4096,
        temperature: 0.7,
      },
      verification: {
        strictMode: false,
        ignoreWarnings: false,
        autoFix: false,
      },
    };

    await writeJSON(configPath, config);

    // Create initial metadata
    const metadata = {
      projectName,
      language: projectType.language,
      framework: projectType.framework,
      packageManager: projectType.packageManager,
      fileCount,
      initializedAt: new Date().toISOString(),
    };

    await writeJSON(path.join(configDir, 'metadata.json'), metadata);

    // Create .gitignore entry if .gitignore exists
    const gitignorePath = path.join(rootPath, '.gitignore');
    if (await exists(gitignorePath)) {
      // In a real implementation, we'd append to .gitignore
      // For now, just notify the user
      logger.info('Consider adding .planfirst/cache/ to your .gitignore');
    }

    spinner.succeed('Project initialized successfully!');

    // Display summary
    logger.newline();
    logger.success('PlanFirst is ready to use! 🚀');
    logger.newline();

    logger.subsection('Project Information');
    logger.keyValue('Name', projectName, 1);
    logger.keyValue('Language', projectType.language, 1);
    if (projectType.framework) {
      logger.keyValue('Framework', projectType.framework, 1);
    }
    if (projectType.packageManager) {
      logger.keyValue('Package Manager', projectType.packageManager, 1);
    }
    if (!options.skipAnalysis) {
      logger.keyValue('Files Analyzed', fileCount.toString(), 1);
    }
    logger.newline();

    logger.subsection('Directories Created');
    logger.item(`.planfirst/  ${logger.dim('(configuration and cache)')}`, 1);
    logger.item(`plans/       ${logger.dim('(generated plans will be saved here)')}`, 1);
    logger.newline();

    logger.subsection('Next Steps');
    logger.item('Set your Anthropic API key:', 1);
    logger.log(`     ${logger.dim('export ANTHROPIC_API_KEY=your_key_here')}`);
    logger.item('Generate your first plan:', 1);
    logger.log(`     ${logger.dim('planfirst plan "Add user authentication"')}`);
    logger.newline();

    logger.subsection('Configuration');
    logger.item(`Config file: ${logger.highlight('.planfirst/config.json')}`, 1);
    logger.item('You can edit this file to customize PlanFirst behavior', 1);
    logger.newline();

  } catch (error) {
    spinner.fail('Initialization failed');
    throw error;
  }
}