import { Plan, Phase, Task, AnalysisResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Planner - Orchestrates plan generation and management
 */

export class Planner {
  /**
   * Create a plan from AI-generated content
   */
  static parsePlanFromMarkdown(
    markdown: string, 
    description: string,
    analysis: AnalysisResult
  ): Plan {
    const planId = `plan-${Date.now()}`;
    
    // Extract title (look for first # header)
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : description.slice(0, 100);

    // Parse phases from markdown sections
    const phases = this.extractPhases(markdown);
    
    // Extract files mentioned in the plan
    const filesAffected = this.extractFilesMentioned(markdown);
    
    // Determine complexity based on content
    const complexity = this.estimateComplexity(markdown, phases.length, filesAffected.length);
    
    const plan: Plan = {
      id: planId,
      title: title,
      description: description,
      timestamp: new Date(),
      phases: phases,
      metadata: {
        estimatedComplexity: complexity,
        filesAffected: filesAffected,
        dependencies: analysis.project.dependencies.slice(0, 10),
        estimatedTime: this.estimateTime(complexity, phases.length),
      },
      status: 'ready',
    };

    return plan;
  }

  /**
   * Extract phases from markdown
   */
  private static extractPhases(markdown: string): Phase[] {
    const phases: Phase[] = [];
    
    // Look for "Phase" headers or numbered sections
    const phasePattern = /##\s+(?:Phase\s+\d+[:\s]+)?(.+?)(?=##\s+|$)/gs;
    const matches = Array.from(markdown.matchAll(phasePattern));
    
    if (matches.length === 0) {
      // If no explicit phases, create a single phase
      return [{
        id: 'phase-1',
        order: 1,
        name: 'Implementation',
        description: 'Complete implementation',
        tasks: this.extractTasks(markdown),
        dependencies: [],
        status: 'pending',
      }];
    }

    matches.forEach((match, idx) => {
      const phaseName = match[1].trim();
      const phaseContent = match[0];
      
      phases.push({
        id: `phase-${idx + 1}`,
        order: idx + 1,
        name: phaseName,
        description: phaseContent.slice(0, 200),
        tasks: this.extractTasks(phaseContent),
        dependencies: idx > 0 ? [`phase-${idx}`] : [],
        status: 'pending',
      });
    });

    return phases.length > 0 ? phases : [{
      id: 'phase-1',
      order: 1,
      name: 'Implementation',
      description: 'Complete implementation',
      tasks: this.extractTasks(markdown),
      dependencies: [],
      status: 'pending',
    }];
  }

  /**
   * Extract tasks from content
   */
  private static extractTasks(content: string): Task[] {
    const tasks: Task[] = [];
    
    // Look for file mentions with actions
    const filePatterns = [
      /(?:Create|Add|Modify|Update|Edit)\s+`([^`]+\.[a-z]+)`/gi,
      /(?:File|Path):\s*`([^`]+\.[a-z]+)`/gi,
      /`([a-zA-Z0-9_\-\/]+\.[a-z]{2,4})`/g
    ];

    const filesFound = new Set<string>();
    
    filePatterns.forEach(pattern => {
      const matches = Array.from(content.matchAll(pattern));
      matches.forEach(match => {
        if (match[1] && !filesFound.has(match[1])) {
          filesFound.add(match[1]);
        }
      });
    });

    // Create tasks for each file
    filesFound.forEach((file, idx) => {
      const taskType = this.determineTaskType(content, file);
      
      tasks.push({
        id: `task-${idx + 1}`,
        type: taskType,
        file: file,
        description: `${taskType.charAt(0).toUpperCase() + taskType.slice(1)} ${file}`,
        reasoning: this.extractReasoning(content, file),
        changes: [],
      });
    });

    // If no files found, create a generic task
    if (tasks.length === 0) {
      tasks.push({
        id: 'task-1',
        type: 'modify',
        file: 'implementation',
        description: 'Implement the planned changes',
        reasoning: 'As described in the plan',
        changes: [],
      });
    }

    return tasks;
  }

  /**
   * Determine task type from content
   */
  private static determineTaskType(content: string, file: string): 'create' | 'modify' | 'delete' {
    const lowerContent = content.toLowerCase();
    const lowerFile = file.toLowerCase();
    
    if (lowerContent.includes(`create ${lowerFile}`) || 
        lowerContent.includes(`new ${lowerFile}`) ||
        lowerContent.includes(`add ${lowerFile}`)) {
      return 'create';
    }
    
    if (lowerContent.includes(`delete ${lowerFile}`) || 
        lowerContent.includes(`remove ${lowerFile}`)) {
      return 'delete';
    }
    
    return 'modify';
  }

  /**
   * Extract reasoning for a file
   */
  private static extractReasoning(content: string, file: string): string {
    // Find the sentence or paragraph mentioning this file
    const sentences = content.split(/[.!?]\s+/);
    const relevantSentence = sentences.find(s => s.includes(file));
    
    return relevantSentence 
      ? relevantSentence.trim().slice(0, 200) 
      : 'Implement as described in the plan';
  }

  /**
   * Extract all files mentioned in the plan
   */
  private static extractFilesMentioned(markdown: string): string[] {
    const files = new Set<string>();
    
    // Match file paths (with extensions)
    const filePattern = /`([a-zA-Z0-9_\-\/\.]+\.[a-z]{2,4})`/g;
    const matches = Array.from(markdown.matchAll(filePattern));
    
    matches.forEach(match => {
      if (match[1] && !match[1].includes(' ')) {
        files.add(match[1]);
      }
    });

    return Array.from(files);
  }

  /**
   * Estimate complexity
   */
  private static estimateComplexity(
    markdown: string, 
    phaseCount: number, 
    fileCount: number
  ): 'low' | 'medium' | 'high' {
    const wordCount = markdown.split(/\s+/).length;
    
    if (fileCount > 10 || phaseCount > 5 || wordCount > 2000) {
      return 'high';
    }
    
    if (fileCount > 5 || phaseCount > 2 || wordCount > 1000) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Estimate time based on complexity
   */
  private static estimateTime(
    complexity: 'low' | 'medium' | 'high',
    phases: number
  ): string {
    const baseHours = {
      low: 2,
      medium: 6,
      high: 16,
    };
    
    const hours = baseHours[complexity] * phases;
    
    if (hours < 8) {
      return `${hours} hours`;
    } else if (hours < 40) {
      return `${Math.ceil(hours / 8)} days`;
    } else {
      return `${Math.ceil(hours / 40)} weeks`;
    }
  }
}