import { FailureAnalyzer, FailureContext } from '../analyzers/FailureAnalyzer';
import { RefinementEngine } from '../engines/RefinementEngine';
import { OxtestParser } from '../../infrastructure/parsers/OxtestParser';
import { Subtask } from '../../domain/entities/Subtask';
import { ExecutionResult } from '../../domain/interfaces/ExecutionResult';

/**
 * Options for self-healing test execution
 */
export interface SelfHealingOptions {
  /** Maximum number of refinement attempts */
  maxAttempts: number;

  /** Whether to capture screenshots during analysis */
  captureScreenshots?: boolean;

  /** Whether to capture HTML during analysis */
  captureHTML?: boolean;

  /** Mock page object for testing */
  mockPage?: any;
}

/**
 * Result of self-healing test execution
 */
export interface SelfHealingResult {
  /** Whether the test ultimately succeeded */
  success: boolean;

  /** Number of attempts made */
  attempts: number;

  /** Final test content that succeeded (or last attempt) */
  finalContent: string;

  /** Total duration of all attempts in milliseconds */
  totalDuration: number;

  /** History of all failure contexts */
  failureHistory: FailureContext[];
}

/**
 * Execution function type for running tests
 */
export type ExecutionFunction = (subtask: Subtask) => Promise<ExecutionResult>;

/**
 * SelfHealingOrchestrator - Coordinates self-healing test execution
 *
 * Part of Sprint 20: Self-Healing Tests
 *
 * Orchestrates the loop: execute → analyze → refine → retry
 */
export class SelfHealingOrchestrator {
  constructor(
    private readonly failureAnalyzer: FailureAnalyzer,
    private readonly refinementEngine: RefinementEngine,
    private readonly oxtestParser: OxtestParser
  ) {}

  /**
   * Executes a test with self-healing capabilities
   *
   * @param oxtestContent The OXTest content to execute
   * @param testName Name of the test (for refinement prompts)
   * @param executionFn Function to execute the test
   * @param options Self-healing options
   * @returns Result of the self-healing execution
   */
  async refineTest(
    oxtestContent: string,
    testName: string,
    executionFn: ExecutionFunction,
    options: SelfHealingOptions
  ): Promise<SelfHealingResult> {
    const startTime = Date.now();
    const failureHistory: FailureContext[] = [];
    let currentContent = oxtestContent;

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      // Parse the current test content
      const commands = await this.oxtestParser.parseContent(currentContent);
      const subtask = new Subtask(`attempt-${attempt}`, testName, [...commands]);

      // Execute the test
      const result = await executionFn(subtask);

      // If successful, we're done!
      if (result.success) {
        return {
          success: true,
          attempts: attempt,
          finalContent: currentContent,
          totalDuration: Date.now() - startTime,
          failureHistory,
        };
      }

      // Test failed - analyze the failure
      if (options.mockPage) {
        const failureContext = await this.failureAnalyzer.analyze(
          subtask,
          result,
          options.mockPage,
          {
            captureScreenshot: options.captureScreenshots,
            captureHTML: options.captureHTML,
          }
        );

        failureHistory.push(failureContext);

        // If we haven't exhausted attempts, refine the test
        if (attempt < options.maxAttempts) {
          currentContent = await this.refinementEngine.refine(
            testName,
            failureContext,
            failureHistory.slice(0, -1)
          );
        }
      } else {
        // Without a page object, we can't analyze or refine
        break;
      }
    }

    // All attempts exhausted
    return {
      success: false,
      attempts: options.maxAttempts,
      finalContent: currentContent,
      totalDuration: Date.now() - startTime,
      failureHistory,
    };
  }
}
