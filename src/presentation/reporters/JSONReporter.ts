import { IReporter, ExecutionReport, SubtaskReport } from './IReporter';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * JSON Reporter - generates machine-readable JSON reports
 *
 * Use cases:
 * - CI/CD integration
 * - Custom tooling and analysis
 * - Data processing pipelines
 *
 * Output format: Pretty-printed JSON with all execution details
 */
export class JSONReporter implements IReporter {
  public readonly name = 'JSON';
  public readonly fileExtension = 'json';

  /**
   * Generate JSON report as a string
   *
   * @param report - Execution report data
   * @returns Promise resolving to formatted JSON string
   */
  public async generate(report: ExecutionReport): Promise<string> {
    // Convert ExecutionReport to a JSON-serializable object
    const jsonReport = {
      testName: report.testName,
      startTime: report.startTime.toISOString(),
      endTime: report.endTime.toISOString(),
      duration: report.duration,
      totalSubtasks: report.totalSubtasks,
      passed: report.passed,
      failed: report.failed,
      blocked: report.blocked,
      success: report.success,
      subtaskReports: report.subtaskReports.map(this.convertSubtaskReport),
    };

    // Pretty-print with 2-space indentation
    return JSON.stringify(jsonReport, null, 2);
  }

  /**
   * Write JSON report to a file
   *
   * @param report - Execution report data
   * @param outputPath - Path where report should be written
   * @returns Promise resolving when file is written
   */
  public async writeToFile(report: ExecutionReport, outputPath: string): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Generate JSON content
    const json = await this.generate(report);

    // Write to file
    await fs.writeFile(outputPath, json, 'utf-8');
  }

  /**
   * Convert SubtaskReport to JSON-serializable format
   *
   * @param subtask - Subtask report
   * @returns JSON-serializable object
   */
  private convertSubtaskReport(subtask: SubtaskReport): Record<string, unknown> {
    const result: Record<string, unknown> = {
      id: subtask.id,
      description: subtask.description,
      status: subtask.status,
    };

    // Add optional fields only if present
    if (subtask.duration !== undefined) {
      result.duration = subtask.duration;
    }

    if (subtask.error !== undefined) {
      result.error = subtask.error;
    }

    if (subtask.output !== undefined) {
      result.output = subtask.output;
    }

    if (subtask.screenshots !== undefined && subtask.screenshots.length > 0) {
      result.screenshots = subtask.screenshots;
    }

    if (subtask.timestamp !== undefined) {
      result.timestamp = subtask.timestamp.toISOString();
    }

    return result;
  }
}
