/**
 * TaskDecompositionService - Decomposes abstract tasks into smaller, concrete steps
 *
 * Single Responsibility: Task decomposition
 * Open/Closed: Can be extended with different decomposition strategies
 * Dependency Inversion: Depends on ILLMProvider abstraction
 */

import { ILLMProvider } from '../../infrastructure/llm/interfaces';

/**
 * A job specification from YAML
 */
export interface JobSpec {
  name: string;
  prompt: string;
  acceptance?: string[];
}

/**
 * Options for task decomposition
 */
export interface DecompositionOptions {
  /** Enable verbose logging */
  verbose?: boolean;

  /** Maximum number of sub-steps to create */
  maxSteps?: number;
}

/**
 * Result of task decomposition
 */
export interface DecompositionResult {
  /** Whether decomposition was performed */
  wasDecomposed: boolean;

  /** Resulting job specifications (original or decomposed) */
  jobs: JobSpec[];

  /** Reason for decomposition or not */
  reason: string;
}

/**
 * Service for decomposing abstract tasks
 */
export class TaskDecompositionService {
  constructor(private readonly llmProvider: ILLMProvider) {}

  /**
   * Analyzes and potentially decomposes a task
   *
   * @param job Original job specification
   * @param options Decomposition options
   * @returns Decomposition result
   */
  async analyzeAndDecompose(
    job: JobSpec,
    options: DecompositionOptions = {}
  ): Promise<DecompositionResult> {
    // Check if task needs decomposition
    if (!this.needsDecomposition(job)) {
      return {
        wasDecomposed: false,
        jobs: [job],
        reason: 'Task is specific enough - no decomposition needed',
      };
    }

    if (options.verbose) {
      console.log(`   🔍 Task "${job.name}" appears abstract - decomposing...`);
    }

    try {
      // Ask LLM to decompose
      const decomposed = await this.decomposeWithLLM(job, options);

      if (decomposed.length > 1) {
        if (options.verbose) {
          console.log(`   ✅ Decomposed into ${decomposed.length} steps:`);
          decomposed.forEach((step, idx) => {
            console.log(`      ${idx + 1}. ${step.name}`);
          });
        }

        return {
          wasDecomposed: true,
          jobs: decomposed,
          reason: `Decomposed abstract task into ${decomposed.length} concrete steps`,
        };
      } else {
        return {
          wasDecomposed: false,
          jobs: [job],
          reason: 'LLM determined task is already specific',
        };
      }
    } catch (error) {
      if (options.verbose) {
        console.log(`   ⚠️  Decomposition failed: ${(error as Error).message}`);
      }

      return {
        wasDecomposed: false,
        jobs: [job],
        reason: `Decomposition failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Checks if a task needs decomposition
   *
   * @param job Job specification
   * @returns True if task should be decomposed
   */
  private needsDecomposition(job: JobSpec): boolean {
    return this.isAbstract(job.prompt) || this.hasMultipleActions(job.prompt);
  }

  /**
   * Checks if a prompt is abstract
   *
   * @param prompt Task prompt
   * @returns True if abstract
   */
  private isAbstract(prompt: string): boolean {
    const abstractPatterns = [
      /add\s+(?:\d+\s+)?products?\s+to\s+cart/i,
      /complete\s+checkout/i,
      /fill\s+(?:the\s+)?form/i,
      /(?:user\s+)?login/i,
      /register\s+(?:a\s+)?(?:new\s+)?user/i,
      /complete\s+(?:the\s+)?(?:payment|order)/i,
      /navigate\s+to\s+\w+/i,
      /verify\s+\w+/i,
    ];

    return abstractPatterns.some(pattern => pattern.test(prompt));
  }

  /**
   * Checks if prompt contains multiple actions
   *
   * @param prompt Task prompt
   * @returns True if multiple actions detected
   */
  private hasMultipleActions(prompt: string): boolean {
    const actionWords = ['click', 'type', 'select', 'verify', 'wait', 'navigate', 'fill'];
    const matches = actionWords.filter(word => new RegExp(`\\b${word}\\b`, 'i').test(prompt));

    return matches.length > 2;
  }

  /**
   * Uses LLM to decompose a task into smaller steps
   *
   * @param job Original job
   * @param options Decomposition options
   * @returns Array of decomposed jobs
   */
  private async decomposeWithLLM(job: JobSpec, options: DecompositionOptions): Promise<JobSpec[]> {
    const maxSteps = options.maxSteps || 5;

    const prompt = `The following test step needs to be decomposed into smaller, more concrete steps:

**Job Name**: ${job.name}
**Prompt**: ${job.prompt}
**Acceptance Criteria**: ${job.acceptance?.join(', ') || 'None specified'}

This task is too abstract or contains multiple actions. Please break it down into smaller,
specific steps that can be executed individually. Each step should:
1. Have a single, clear action
2. Be concrete and specific
3. Include validation criteria

Return ONLY a JSON array of steps (no explanations, no markdown):
[
  {
    "name": "descriptive-step-name",
    "prompt": "specific action description with exact element names",
    "acceptance": ["specific validation criteria"]
  }
]

Maximum ${maxSteps} steps. If the task is actually already specific, return an array with just the original task.`;

    const response = await this.llmProvider.generate(prompt, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    // Clean up response - remove markdown code blocks
    let content = response.content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const steps: JobSpec[] = JSON.parse(content);

      // Validate response
      if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error('Invalid response format');
      }

      // Validate each step
      for (const step of steps) {
        if (!step.name || !step.prompt) {
          throw new Error('Each step must have name and prompt');
        }
      }

      return steps;
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${(error as Error).message}`);
    }
  }
}
