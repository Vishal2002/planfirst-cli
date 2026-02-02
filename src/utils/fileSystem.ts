import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';
import { FileNode, FileTree, FileStats, FileSystemError } from '../types';
import { logger } from './logger';

/**
 * File System utilities for PlanFirst CLI
 */

/**
 * Check if a path exists
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new FileSystemError(`Failed to read file: ${filePath}`, error);
  }
}

/**
 * Write file content
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new FileSystemError(`Failed to write file: ${filePath}`, error);
  }
}

/**
 * Read JSON file
 */
export async function readJSON<T = any>(filePath: string): Promise<T> {
  try {
    return await fs.readJSON(filePath);
  } catch (error) {
    throw new FileSystemError(`Failed to read JSON file: ${filePath}`, error);
  }
}

/**
 * Write JSON file
 */
export async function writeJSON(
  filePath: string,
  data: any,
  pretty: boolean = true
): Promise<void> {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJSON(filePath, data, { spaces: pretty ? 2 : 0 });
  } catch (error) {
    throw new FileSystemError(`Failed to write JSON file: ${filePath}`, error);
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string): Promise<FileStats> {
  try {
    const stats = await fs.stat(filePath);
    return {
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory(),
      extension: path.extname(filePath),
    };
  } catch (error) {
    throw new FileSystemError(`Failed to get file stats: ${filePath}`, error);
  }
}

/**
 * List directory contents
 */
export async function listDirectory(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch (error) {
    throw new FileSystemError(`Failed to list directory: ${dirPath}`, error);
  }
}

/**
 * Create directory recursively
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath);
  } catch (error) {
    throw new FileSystemError(`Failed to create directory: ${dirPath}`, error);
  }
}

/**
 * Copy file or directory
 */
export async function copy(src: string, dest: string): Promise<void> {
  try {
    await fs.copy(src, dest);
  } catch (error) {
    throw new FileSystemError(`Failed to copy ${src} to ${dest}`, error);
  }
}

/**
 * Remove file or directory
 */
export async function remove(filePath: string): Promise<void> {
  try {
    await fs.remove(filePath);
  } catch (error) {
    throw new FileSystemError(`Failed to remove: ${filePath}`, error);
  }
}

/**
 * Get programming language from file extension
 */
export function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cs': 'csharp',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.sql': 'sql',
    '.sh': 'shell',
    '.bash': 'shell',
  };

  return languageMap[extension.toLowerCase()] || 'unknown';
}

/**
 * Default ignore patterns for code analysis
 */
export const DEFAULT_IGNORE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.git/**',
  '.next/**',
  '.nuxt/**',
  'coverage/**',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  '.env*',
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.planfirst/**',
];

/**
 * Load .gitignore patterns
 */
export async function loadGitignorePatterns(rootPath: string): Promise<string[]> {
  const gitignorePath = path.join(rootPath, '.gitignore');
  if (!(await exists(gitignorePath))) {
    return [];
  }

  try {
    const content = await readFile(gitignorePath);
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (error) {
    logger.warn('Failed to load .gitignore', error);
    return [];
  }
}

/**
 * Create ignore matcher
 */
export async function createIgnoreMatcher(
  rootPath: string,
  additionalPatterns: string[] = []
): Promise<ReturnType<typeof ignore>> {
  const gitignorePatterns = await loadGitignorePatterns(rootPath);
  const allPatterns = [
    ...DEFAULT_IGNORE_PATTERNS,
    ...gitignorePatterns,
    ...additionalPatterns,
  ];

  const ig = ignore().add(allPatterns);
  return ig;
}

/**
 * Scan directory recursively and build file tree
 */
export async function scanDirectory(
  rootPath: string,
  excludePatterns: string[] = []
): Promise<FileTree> {
  const fileTree: FileTree = {};
  const ig = await createIgnoreMatcher(rootPath, excludePatterns);

  async function scan(currentPath: string, relativePath: string = ''): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        // Check if should be ignored
        if (ig.ignores(relPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          fileTree[relPath] = {
            type: 'directory',
          };
          await scan(fullPath, relPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          const ext = path.extname(entry.name);
          const language = getLanguageFromExtension(ext);

          fileTree[relPath] = {
            type: 'file',
            size: stats.size,
            language,
            extension: ext,
          };
        }
      }
    } catch (error) {
      logger.debug(`Error scanning directory ${currentPath}:`, error);
    }
  }

  await scan(rootPath);
  return fileTree;
}

/**
 * Find files by pattern
 */
export async function findFiles(
  rootPath: string,
  pattern: string,
  excludePatterns: string[] = []
): Promise<string[]> {
  try {
    const ig = await createIgnoreMatcher(rootPath, excludePatterns);
    
    const files = await glob(pattern, {
      cwd: rootPath,
      absolute: false,
      nodir: true,
    });

    return files.filter(file => !ig.ignores(file));
  } catch (error) {
    throw new FileSystemError(`Failed to find files with pattern: ${pattern}`, error);
  }
}

/**
 * Find package.json
 */
export async function findPackageJson(rootPath: string): Promise<string | null> {
  const packagePath = path.join(rootPath, 'package.json');
  return (await exists(packagePath)) ? packagePath : null;
}

/**
 * Read package.json
 */
export async function readPackageJson(rootPath: string): Promise<any | null> {
  const packagePath = await findPackageJson(rootPath);
  if (!packagePath) return null;

  try {
    return await readJSON(packagePath);
  } catch (error) {
    logger.warn('Failed to read package.json', error);
    return null;
  }
}

/**
 * Detect project type
 */
export async function detectProjectType(rootPath: string): Promise<{
  language: string;
  framework?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm'| undefined;
}> {
  const packageJson = await readPackageJson(rootPath);

  let language = 'unknown';
  let framework: string | undefined;
  let packageManager: 'npm' | 'yarn' | 'pnpm'| undefined;

  // Detect language
  const hasTsConfig = await exists(path.join(rootPath, 'tsconfig.json'));
  if (hasTsConfig || packageJson?.devDependencies?.typescript) {
    language = 'typescript';
  } else if (packageJson) {
    language = 'javascript';
  } else if (await exists(path.join(rootPath, 'requirements.txt'))) {
    language = 'python';
  } else if (await exists(path.join(rootPath, 'go.mod'))) {
    language = 'go';
  } else if (await exists(path.join(rootPath, 'Cargo.toml'))) {
    language = 'rust';
  }

  // Detect framework
  if (packageJson?.dependencies) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (deps.react) framework = 'react';
    else if (deps.vue) framework = 'vue';
    else if (deps.next) framework = 'next';
    else if (deps.express) framework = 'express';
    else if (deps['@nestjs/core']) framework = 'nestjs';
    else if (deps.angular) framework = 'angular';
  }

  // Detect package manager
  if (await exists(path.join(rootPath, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (await exists(path.join(rootPath, 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (await exists(path.join(rootPath, 'package-lock.json'))) {
    packageManager = 'npm';
  }

  return { language, framework, packageManager };
}

/**
 * Get relative path from root
 */
export function getRelativePath(rootPath: string, filePath: string): string {
  return path.relative(rootPath, filePath);
}

/**
 * Get absolute path from root
 */
export function getAbsolutePath(rootPath: string, relativePath: string): string {
  return path.resolve(rootPath, relativePath);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Count lines in file
 */
export async function countLines(filePath: string): Promise<number> {
  try {
    const content = await readFile(filePath);
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * Get total lines in directory
 */
export async function getTotalLines(
  rootPath: string,
  extensions: string[] = ['.js', '.ts', '.jsx', '.tsx']
): Promise<number> {
  const fileTree = await scanDirectory(rootPath);
  let totalLines = 0;

  for (const [filePath, node] of Object.entries(fileTree)) {
    if (node.type === 'file' && node.extension && extensions.includes(node.extension)) {
      const fullPath = path.join(rootPath, filePath);
      totalLines += await countLines(fullPath);
    }
  }

  return totalLines;
}