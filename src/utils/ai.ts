import { AIRequest, AIResponse, AIError } from '../types';
import { logger } from './logger';
import dotenv from 'dotenv';
dotenv.config();

/**
 * AI Integration for PlanFirst CLI
 * Supports both OpenAI and Anthropic APIs
 */

type AIProvider = 'openai' | 'anthropic';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AIClient {
  private provider: AIProvider;
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private baseURL: string;

  constructor(config: {
    provider?: AIProvider;
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    // Determine provider - prefer OpenAI if both are available
    const hasOpenAI = !!(config.apiKey || process.env.OPENAI_API_KEY);
    const hasAnthropic = !!(config.apiKey || process.env.ANTHROPIC_API_KEY);
    
    if (config.provider) {
      this.provider = config.provider;
    } else if (hasOpenAI) {
      this.provider = 'openai';
    } else if (hasAnthropic) {
      this.provider = 'anthropic';
    } else {
      throw new AIError(
        'No API key found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.'
      );
    }

    // Set API key based on provider
    if (this.provider === 'openai') {
      this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
      this.model = config.model || 'gpt-4o';
      this.baseURL = 'https://api.openai.com/v1';
    } else {
      this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
      this.model = config.model || 'claude-sonnet-4-20250514';
      this.baseURL = 'https://api.anthropic.com/v1';
    }

    if (!this.apiKey) {
      throw new AIError(
        `${this.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key not found.`
      );
    }

    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;

    logger.debug(`Using ${this.provider.toUpperCase()} API with model: ${this.model}`);
  }


  /**
   * Generate completion from AI
   */
  async complete(request: AIRequest): Promise<AIResponse> {
    logger.debug(`Sending request to ${this.provider.toUpperCase()} API...`);

    if (this.provider === 'openai') {
      return await this.completeWithOpenAI(request);
    } else {
      return await this.completeWithAnthropic(request);
    }
  }

  /**
   * Generate completion with OpenAI
   */
  private async completeWithOpenAI(request: AIRequest): Promise<AIResponse> {
    const messages: OpenAIMessage[] = [];

    // Add system message if provided
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    } else {
      messages.push({
        role: 'system',
        content: this.getDefaultSystemPrompt(),
      });
    }

    // Add user message with context and prompt
    const userContent = this.buildPrompt(request);
    messages.push({
      role: 'user',
      content: userContent,
    });

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: request.maxTokens || this.maxTokens,
          temperature: request.temperature || this.temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new AIError(`OpenAI API request failed: ${response.status} - ${error}`);
      }
     //@ts-ignore
      const data: OpenAIResponse = await response.json();

      logger.debug('Received response from OpenAI API');

      return {
        content: data.choices[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        model: data.model,
      };
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }
      throw new AIError('Failed to communicate with OpenAI API', error);
    }
  }

  /**
   * Generate completion with Anthropic
   */
  private async completeWithAnthropic(request: AIRequest): Promise<AIResponse> {
    const messages: AnthropicMessage[] = [
      {
        role: 'user',
        content: this.buildPrompt(request),
      },
    ];

    try {
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens || this.maxTokens,
          temperature: request.temperature || this.temperature,
          system: request.systemPrompt || this.getDefaultSystemPrompt(),
          messages,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new AIError(`Anthropic API request failed: ${response.status} - ${error}`);
      }
     //@ts-ignore
      const data: AnthropicResponse = await response.json();

      logger.debug('Received response from Anthropic API');

      return {
        content: data.content[0]?.text || '',
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        model: data.model,
      };
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }
      throw new AIError('Failed to communicate with Anthropic API', error);
    }
  }

  /**
   * Build prompt from request
   */
  private buildPrompt(request: AIRequest): string {
    let prompt = '';

    if (request.context) {
      prompt += `# Context\n\n${request.context}\n\n`;
    }

    prompt += `# Task\n\n${request.prompt}`;

    return prompt;
  }

  /**
   * Get default system prompt for plan generation
   */
  private getDefaultSystemPrompt(): string {
    return `You are an expert software architect and planning assistant. Your role is to help developers create detailed, actionable implementation plans.

When creating plans, you should:
1. Break down complex tasks into manageable phases
2. Identify all files that need to be created or modified
3. Provide clear reasoning for each change
4. Consider dependencies between tasks
5. Suggest best practices and patterns
6. Be specific about what code changes are needed
7. Consider edge cases and potential issues

Your plans should be thorough but practical, focusing on actionable steps rather than abstract concepts.`;
  }

  /**
   * Generate implementation plan
   */
  async generatePlan(description: string, context: string): Promise<string> {
    const prompt = `Generate a detailed implementation plan for the following task:

${description}

Based on the project context provided, create a comprehensive plan that includes:
1. Overview and objectives
2. Phases breakdown (if the task is complex)
3. Detailed file changes with:
   - What file to create/modify
   - What changes to make
   - Why these changes are needed
   - Code snippets where helpful
4. Dependencies and prerequisites
5. Testing strategy
6. Potential risks and considerations

Format the plan in Markdown with clear sections and structure.`;

    const response = await this.complete({
      prompt,
      context,
      maxTokens: 8000,
      temperature: 0.7,
    });

    return response.content;
  }

  /**
   * Refine a plan based on user feedback
   */
  async refinePlan(originalPlan: string, feedback: string): Promise<string> {
    const prompt = `Here is an implementation plan:

${originalPlan}

User feedback:
${feedback}

Please refine the plan based on this feedback. Keep the same structure but incorporate the requested changes or clarifications.`;

    const response = await this.complete({
      prompt,
      maxTokens: 8000,
      temperature: 0.7,
    });

    return response.content;
  }

  /**
   * Ask clarifying questions
   */
  async askClarifyingQuestions(description: string, context: string): Promise<string[]> {
    const prompt = `Based on this task description and project context, generate 3-5 clarifying questions that would help create a better implementation plan:

Task: ${description}

Format your response as a JSON array of strings, with each string being a question.`;

    const response = await this.complete({
      prompt,
      context,
      maxTokens: 1000,
      temperature: 0.8,
    });

    try {
      // Try to parse as JSON
      const content = response.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: split by newlines and clean up
      return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.match(/^\d+[\.)]/))
        .map(line => line.replace(/^\d+[\.)]/, '').trim())
        .slice(0, 5);
    } catch (error) {
      logger.warn('Failed to parse clarifying questions, using fallback');
      return [
        'What are the main requirements for this feature?',
        'Are there any existing patterns or conventions in the codebase I should follow?',
        'What is the expected timeline or complexity for this task?',
      ];
    }
  }

  /**
   * Analyze implementation for verification
   */
  async analyzeImplementation(
    plan: string,
    currentCode: string,
    changedFiles: string[]
  ): Promise<string> {
    const prompt = `Compare this implementation against the original plan and identify:
1. What was implemented correctly
2. What is missing
3. What differs from the plan
4. Any potential issues or regressions

Plan:
${plan}

Changed Files: ${changedFiles.join(', ')}

Current Implementation:
${currentCode}

Provide a structured analysis in Markdown format.`;

    const response = await this.complete({
      prompt,
      maxTokens: 4000,
      temperature: 0.5,
    });

    return response.content;
  }
}

/**
 * Create AI client instance
 */
export function createAIClient(config?: {
  provider?: 'openai' | 'anthropic';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): AIClient {
  return new AIClient(config || {});
}

/**
 * Check if any API key is configured
 */
export function isAPIKeyConfigured(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

/**
 * Get which provider is available
 */
export function getAvailableProvider(): 'openai' | 'anthropic' | null {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}