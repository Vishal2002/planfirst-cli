import chalk from 'chalk';

/**
 * Logger utility for PlanFirst CLI
 * Provides colored, formatted logging with different levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

interface LoggerOptions {
  level?: LogLevel;
  silent?: boolean;
  timestamp?: boolean;
}

class Logger {
  private level: LogLevel;
  private silent: boolean;
  private timestamp: boolean;

  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    success: 1,
    warn: 2,
    error: 3,
  };

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info';
    this.silent = options.silent || false;
    this.timestamp = options.timestamp || false;
  }

  /**
   * Check if a log level should be shown
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.silent) return false;
    return this.levels[level] >= this.levels[this.level];
  }

  /**
   * Format timestamp
   */
  private getTimestamp(): string {
    if (!this.timestamp) return '';
    const now = new Date();
    return chalk.gray(`[${now.toLocaleTimeString()}] `);
  }

  /**
   * Debug log (cyan)
   */
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog('debug')) return;
    console.log(
      `${this.getTimestamp()}${chalk.cyan('●')} ${chalk.cyan(message)}`,
      ...args
    );
  }

  /**
   * Info log (blue)
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog('info')) return;
    console.log(
      `${this.getTimestamp()}${chalk.blue('ℹ')} ${message}`,
      ...args
    );
  }

  /**
   * Success log (green)
   */
  success(message: string, ...args: any[]): void {
    if (!this.shouldLog('success')) return;
    console.log(
      `${this.getTimestamp()}${chalk.green('✓')} ${chalk.green(message)}`,
      ...args
    );
  }

  /**
   * Warning log (yellow)
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog('warn')) return;
    console.warn(
      `${this.getTimestamp()}${chalk.yellow('⚠')} ${chalk.yellow(message)}`,
      ...args
    );
  }

  /**
   * Error log (red)
   */
  error(message: string, error?: Error | any, ...args: any[]): void {
    if (!this.shouldLog('error')) return;
    console.error(
      `${this.getTimestamp()}${chalk.red('✖')} ${chalk.red(message)}`,
      ...args
    );
    if (error) {
      if (error instanceof Error) {
        console.error(chalk.red(error.stack || error.message));
      } else {
        console.error(chalk.red(JSON.stringify(error, null, 2)));
      }
    }
  }

  /**
   * Log with custom formatting
   */
  log(message: string, ...args: any[]): void {
    if (this.silent) return;
    console.log(message, ...args);
  }

  /**
   * Section header
   */
  section(title: string): void {
    if (this.silent) return;
    console.log();
    console.log(chalk.bold.cyan(`━━━ ${title} ━━━`));
    console.log();
  }

  /**
   * Subsection header
   */
  subsection(title: string): void {
    if (this.silent) return;
    console.log();
    console.log(chalk.bold(`  ${title}`));
  }

  /**
   * List item
   */
  item(text: string, indent: number = 0): void {
    if (this.silent) return;
    const indentation = '  '.repeat(indent);
    console.log(`${indentation}${chalk.gray('•')} ${text}`);
  }

  /**
   * Key-value pair
   */
  keyValue(key: string, value: string, indent: number = 0): void {
    if (this.silent) return;
    const indentation = '  '.repeat(indent);
    console.log(`${indentation}${chalk.gray(key + ':')} ${value}`);
  }

  /**
   * Divider line
   */
  divider(): void {
    if (this.silent) return;
    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * Empty line
   */
  newline(): void {
    if (this.silent) return;
    console.log();
  }

  /**
   * Spinner-compatible message (for use with ora)
   */
  spinner(message: string): string {
    return message;
  }

  /**
   * Highlight text
   */
  highlight(text: string): string {
    return chalk.cyan.bold(text);
  }

  /**
   * Dim text
   */
  dim(text: string): string {
    return chalk.gray(text);
  }

  /**
   * Bold text
   */
  bold(text: string): string {
    return chalk.bold(text);
  }

  /**
   * Table-like output
   */
  table(headers: string[], rows: string[][]): void {
    if (this.silent) return;

    // Calculate column widths
    const columnWidths = headers.map((header, i) => {
      const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
      return Math.max(header.length, maxRowWidth);
    });

    // Print header
    const headerRow = headers
      .map((header, i) => header.padEnd(columnWidths[i]))
      .join(' │ ');
    console.log(chalk.bold(headerRow));
    console.log(chalk.gray('─'.repeat(headerRow.length)));

    // Print rows
    rows.forEach(row => {
      const rowStr = row
        .map((cell, i) => (cell || '').padEnd(columnWidths[i]))
        .join(' │ ');
      console.log(rowStr);
    });
  }

  /**
   * Progress indicator
   */
  progress(current: number, total: number, label?: string): void {
    if (this.silent) return;
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * 20);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    const text = label ? ` ${label}` : '';
    console.log(`${chalk.cyan(bar)} ${percentage}%${text} (${current}/${total})`);
  }

  /**
   * Box output for important messages
   */
  box(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
    if (this.silent) return;

    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warn: chalk.yellow,
      error: chalk.red,
    };

    const color = colors[type];
    const lines = message.split('\n');
    const maxLength = Math.max(...lines.map(l => l.length));
    const width = Math.min(maxLength + 4, 80);

    console.log();
    console.log(color('┌' + '─'.repeat(width - 2) + '┐'));
    lines.forEach(line => {
      const padded = line.padEnd(width - 4);
      console.log(color('│') + ` ${padded} ` + color('│'));
    });
    console.log(color('└' + '─'.repeat(width - 2) + '┘'));
    console.log();
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Set silent mode
   */
  setSilent(silent: boolean): void {
    this.silent = silent;
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): Logger {
    const childLogger = new Logger({
      level: this.level,
      silent: this.silent,
      timestamp: this.timestamp,
    });

    // Override methods to add prefix
    const originalMethods = ['debug', 'info', 'success', 'warn', 'error'];
    originalMethods.forEach(method => {
      const original = (childLogger as any)[method].bind(childLogger);
      (childLogger as any)[method] = (message: string, ...args: any[]) => {
        original(`${chalk.gray(`[${prefix}]`)} ${message}`, ...args);
      };
    });

    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  timestamp: process.env.LOG_TIMESTAMP === 'true',
});

// Export class for custom instances
export default Logger;