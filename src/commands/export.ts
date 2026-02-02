import { ExportOptions } from '../types';
import { logger } from '../utils/logger';

/**
 * Export a plan for coding agents
 */
export async function exportCommand(
  planId: string,
  options: ExportOptions
): Promise<void> {
  logger.info('Export command will be implemented next');
  logger.info(`Plan ID: ${planId}`);
  logger.info(`Options:`, options);
  
  // TODO: Implement export
  // 1. Load plan
  // 2. Format according to export format
  // 3. Save to output file
  // 4. Display export location
}