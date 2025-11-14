import { TaskStatus } from '../../domain/enums/TaskStatus';

/**
 * Report for a single subtask execution
 */
export interface SubtaskReport {
  readonly id: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly duration?: number;
  readonly error?: string;
  readonly output?: string;
  readonly screenshots?: ReadonlyArray<string>;
  readonly timestamp?: Date;
}

/**
 * Complete execution report for a test task
 */
export interface ExecutionReport {
  readonly testName: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly duration: number;
  readonly totalSubtasks: number;
  readonly passed: number;
  readonly failed: number;
  readonly blocked: number;
  readonly subtaskReports: ReadonlyArray<SubtaskReport>;
  readonly success: boolean;
}

/**
 * Reporter interface for generating test execution reports
 *
 * Implementations:
 * - HTMLReporter: Beautiful HTML reports with charts and screenshots
 * - JSONReporter: Machine-readable JSON for CI/CD integration
 * - JUnitReporter: Standard JUnit XML format for CI systems
 * - ConsoleReporter: Enhanced console output with colors and tables
 */
export interface IReporter {
  /** Reporter name (e.g., "HTML", "JSON", "JUnit") */
  readonly name: string;

  /** File extension for report output (e.g., "html", "json", "xml") */
  readonly fileExtension: string;

  /**
   * Generate report content as a string
   * @param report - Execution report data
   * @returns Promise resolving to report content
   */
  generate(report: ExecutionReport): Promise<string>;

  /**
   * Write report to a file
   * @param report - Execution report data
   * @param outputPath - Path where report should be written
   * @returns Promise resolving when file is written
   */
  writeToFile(report: ExecutionReport, outputPath: string): Promise<void>;
}
