/**
 * OXTestValidator - Validates OXTest files by executing them
 *
 * Single Responsibility: Validation of OXTest files
 * Open/Closed: Can be extended with different validation strategies
 * Dependency Inversion: Depends on abstractions (IExecutor)
 */

import { PlaywrightExecutor } from '../../infrastructure/executors/PlaywrightExecutor';
import { OxtestParser } from '../../infrastructure/parsers/OxtestParser';
import { Subtask } from '../../domain/entities/Subtask';

/**
 * Result of OXTest validation
 */
export interface ValidationResult {
  /** Whether validation succeeded */
  success: boolean;

  /** Error message if validation failed */
  error?: string;

  /** Number of commands executed */
  commandsExecuted: number;

  /** Duration in milliseconds */
  duration: number;

  /** Failed command index if applicable */
  failedCommandIndex?: number;

  /** Current page URL when failure occurred */
  pageURL?: string;

  /** Available selectors on the page when failure occurred */
  availableSelectors?: string[];
}

/**
 * Options for validation
 */
export interface ValidationOptions {
  /** Enable verbose logging */
  verbose?: boolean;

  /** Capture screenshots on failure */
  captureScreenshots?: boolean;

  /** Capture HTML on failure */
  captureHTML?: boolean;

  /** Timeout for each command in milliseconds */
  commandTimeout?: number;
}

/**
 * Service for validating OXTest files
 */
export class OXTestValidator {
  private readonly parser: OxtestParser;

  constructor() {
    this.parser = new OxtestParser();
  }

  /**
   * Validates an OXTest file by executing it
   *
   * @param oxtestFilePath Path to the .ox.test file
   * @param testName Name of the test
   * @param options Validation options
   * @returns Validation result
   */
  async validate(
    oxtestFilePath: string,
    testName: string,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const executor = new PlaywrightExecutor(options.verbose);

    try {
      // Initialize browser
      await executor.initialize();

      // Parse the OXTest file
      const commands = await this.parser.parseFile(oxtestFilePath);

      if (commands.length === 0) {
        return {
          success: false,
          error: 'No commands found in OXTest file',
          commandsExecuted: 0,
          duration: 0,
        };
      }

      // Create subtask
      const subtask = new Subtask('validation', testName, Array.from(commands));

      // Execute all commands
      const startTime = Date.now();
      const results = await executor.executeAll(subtask.commands);
      const duration = Date.now() - startTime;

      // Check if all succeeded
      const failedResult = results.find(r => !r.success);

      if (failedResult) {
        const failedIndex = results.indexOf(failedResult);

        return {
          success: false,
          error: failedResult.error || 'Execution failed',
          commandsExecuted: results.length,
          duration,
          failedCommandIndex: failedIndex,
        };
      }

      return {
        success: true,
        commandsExecuted: results.length,
        duration,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        commandsExecuted: 0,
        duration: 0,
      };
    } finally {
      await executor.close();
    }
  }

  /**
   * Validates OXTest content (string) without requiring a file
   *
   * @param oxtestContent OXTest content as string
   * @param testName Name of the test
   * @param options Validation options
   * @returns Validation result
   */
  async validateContent(
    oxtestContent: string,
    testName: string,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const executor = new PlaywrightExecutor(options.verbose);

    try {
      await executor.initialize();

      // Parse content directly
      const commands = await this.parser.parseContent(oxtestContent);

      if (commands.length === 0) {
        return {
          success: false,
          error: 'No commands found in OXTest content',
          commandsExecuted: 0,
          duration: 0,
        };
      }

      const subtask = new Subtask('validation', testName, Array.from(commands));

      const startTime = Date.now();
      const results = await executor.executeAll(subtask.commands);
      const duration = Date.now() - startTime;

      const failedResult = results.find(r => !r.success);

      if (failedResult) {
        return {
          success: false,
          error: failedResult.error,
          commandsExecuted: results.length,
          duration,
          failedCommandIndex: results.indexOf(failedResult),
        };
      }

      return {
        success: true,
        commandsExecuted: results.length,
        duration,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        commandsExecuted: 0,
        duration: 0,
      };
    } finally {
      await executor.close();
    }
  }
}
