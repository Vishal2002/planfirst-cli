import { Phase } from '../types';

/**
 * Phaser - Manages phase execution and dependencies
 */

export class Phaser {
  /**
   * Get executable phases (phases whose dependencies are met)
   */
  static getExecutablePhases(phases: Phase[]): Phase[] {
    return phases.filter(phase => 
      phase.status === 'pending' &&
      phase.dependencies.every(depId => 
        phases.find(p => p.id === depId)?.status === 'completed'
      )
    );
  }

  /**
   * Check if all phases are completed
   */
  static areAllPhasesCompleted(phases: Phase[]): boolean {
    return phases.every(phase => phase.status === 'completed');
  }
}