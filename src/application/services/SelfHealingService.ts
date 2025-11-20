/**
 * SelfHealingService - Orchestrates self-healing for failed OXTest files
 *
 * Single Responsibility: Self-healing coordination
 * Open/Closed: Can be extended with different healing strategies
 * Dependency Inversion: Depends on abstractions (ILLMProvider, etc.)
 *
 * Integrates existing components:
 * - SelfHealingOrchestrator
 * - FailureAnalyzer
 * - RefinementEngine
 */

import { ILLMProvider } from '../../infrastructure/llm/interfaces';
import { SelfHealingOrchestrator } from '../orchestrators/SelfHealingOrchestrator';
import { FailureAnalyzer } from '../analyzers/FailureAnalyzer';
import { RefinementEngine } from '../engines/RefinementEngine';
import { OxtestParser } from '../../infrastructure/parsers/OxtestParser';
import { PlaywrightExecutor } from '../../infrastructure/executors/PlaywrightExecutor';
import { Subtask } from '../../domain/entities/Subtask';
import { ExecutionResult } from '../../domain/interfaces/ExecutionResult';

/**
 * Options for self-healing
 */
export interface SelfHealingOptions {
  /** Maximum number of healing attempts */
  maxAttempts: number;

  /** Enable verbose logging */
  verbose?: boolean;

  /** Capture screenshots during healing */
  captureScreenshots?: boolean;

  /** Capture HTML during healing */
  captureHTML?: boolean;
}

/**
 * Result of self-healing process
 */
export interface SelfHealingResult {
  /** Whether healing succeeded */
  success: boolean;

  /** Number of attempts made */
  attempts: number;

  /** Final (healed) OXTest content */
  healedContent?: string;

  /** Total duration in milliseconds */
  totalDuration: number;

  /** Error message if healing failed */
  error?: string;
}

/**
 * Service for self-healing failed OXTest files
 */
export class SelfHealingService {
  private readonly orchestrator: SelfHealingOrchestrator;

  constructor(llmProvider: ILLMProvider) {
    // Initialize self-healing components
    const failureAnalyzer = new FailureAnalyzer();
    const refinementEngine = new RefinementEngine(llmProvider);
    const parser = new OxtestParser();

    this.orchestrator = new SelfHealingOrchestrator(failureAnalyzer, refinementEngine, parser);
  }

  /**
   * Attempts to heal a failed OXTest
   *
   * @param oxtestContent Original OXTest content that failed
   * @param testName Name of the test
   * @param options Self-healing options
   * @returns Self-healing result
   */
  async heal(
    oxtestContent: string,
    testName: string,
    options: SelfHealingOptions
  ): Promise<SelfHealingResult> {
    const startTime = Date.now();

    try {
      // Create execution function for the orchestrator
      const executionFn = this.createExecutionFunction(options.verbose);

      // Run self-healing loop
      const result = await this.orchestrator.refineTest(oxtestContent, testName, executionFn, {
        maxAttempts: options.maxAttempts,
        captureScreenshots: options.captureScreenshots,
        captureHTML: options.captureHTML,
      });

      const totalDuration = Date.now() - startTime;

      if (result.success) {
        if (options.verbose) {
          console.log(`   ✅ Self-healing succeeded after ${result.attempts} attempt(s)`);
        }

        return {
          success: true,
          attempts: result.attempts,
          healedContent: result.finalContent,
          totalDuration,
        };
      } else {
        if (options.verbose) {
          console.log(`   ⚠️  Self-healing failed after ${result.attempts} attempt(s)`);
        }

        return {
          success: false,
          attempts: result.attempts,
          totalDuration,
          error: `Failed after ${result.attempts} attempts`,
        };
      }
    } catch (error) {
      const totalDuration = Date.now() - startTime;

      return {
        success: false,
        attempts: 0,
        totalDuration,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Creates an execution function for the orchestrator
   * This function will be called repeatedly during the healing loop
   *
   * @param verbose Enable verbose logging
   * @returns Execution function
   */
  private createExecutionFunction(
    verbose: boolean = false
  ): (subtask: Subtask) => Promise<ExecutionResult> {
    return async (subtask: Subtask): Promise<ExecutionResult> => {
      const executor = new PlaywrightExecutor(verbose);

      try {
        await executor.initialize();

        const results = await executor.executeAll(subtask.commands);
        const allSucceeded = results.every(r => r.success);
        const failedResult = results.find(r => !r.success);

        return {
          success: allSucceeded,
          error: failedResult?.error ? new Error(failedResult.error) : undefined,
          duration: results.reduce((sum, r) => sum + r.duration, 0),
          metadata: { commandsExecuted: results.length },
        };
      } catch (error) {
        return {
          success: false,
          error: error as Error,
          duration: 0,
          metadata: { commandsExecuted: 0 },
        };
      } finally {
        await executor.close();
      }
    };
  }
}
