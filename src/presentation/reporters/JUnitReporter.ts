import { IReporter, ExecutionReport, SubtaskReport } from './IReporter';
import { TaskStatus } from '../../domain/enums/TaskStatus';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * JUnit Reporter - generates JUnit XML test reports
 *
 * Use cases:
 * - CI/CD integration (Jenkins, GitHub Actions, GitLab CI)
 * - Test result visualization in CI systems
 * - Standard test reporting format
 *
 * Output format: JUnit XML with testsuite and testcase elements
 */
export class JUnitReporter implements IReporter {
  public readonly name = 'JUnit';
  public readonly fileExtension = 'xml';

  /**
   * Generate JUnit XML report as a string
   *
   * @param report - Execution report data
   * @returns Promise resolving to formatted XML string
   */
  public async generate(report: ExecutionReport): Promise<string> {
    const lines: string[] = [];

    // XML declaration
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');

    // Testsuite element
    const timestamp = report.startTime.toISOString();
    const timeInSeconds = (report.duration / 1000).toFixed(3);
    const failures = report.failed;

    lines.push(
      `<testsuite name="${this.escapeXml(report.testName)}" ` +
        `tests="${report.totalSubtasks}" ` +
        `failures="${failures}" ` +
        `time="${timeInSeconds}" ` +
        `timestamp="${timestamp}">`
    );

    // Testcase elements
    for (const subtask of report.subtaskReports) {
      lines.push(this.generateTestCase(subtask, report.testName));
    }

    // Close testsuite
    lines.push('</testsuite>');

    return lines.join('\n');
  }

  /**
   * Write JUnit XML report to a file
   *
   * @param report - Execution report data
   * @param outputPath - Path where report should be written
   * @returns Promise resolving when file is written
   */
  public async writeToFile(report: ExecutionReport, outputPath: string): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Generate XML content
    const xml = await this.generate(report);

    // Write to file
    await fs.writeFile(outputPath, xml, 'utf-8');
  }

  /**
   * Generate a testcase element for a subtask
   *
   * @param subtask - Subtask report
   * @param suiteName - Test suite name (used as classname)
   * @returns XML string for testcase element
   */
  private generateTestCase(subtask: SubtaskReport, suiteName: string): string {
    const lines: string[] = [];
    const duration = subtask.duration !== undefined ? subtask.duration : 0;
    const timeInSeconds = (duration / 1000).toFixed(3);

    const testcaseAttrs =
      `  <testcase name="${this.escapeXml(subtask.description)}" ` +
      `classname="${this.escapeXml(suiteName)}" ` +
      `time="${timeInSeconds}"`;

    // Check if testcase has failure or is skipped
    const isFailed = subtask.status === TaskStatus.Failed;
    const isSkipped =
      subtask.status === TaskStatus.Blocked || subtask.status === TaskStatus.Pending;

    if (!isFailed && !isSkipped) {
      // Simple self-closing tag for successful tests
      lines.push(`${testcaseAttrs} />`);
    } else {
      // Open tag for failed or skipped tests
      lines.push(`${testcaseAttrs}>`);

      if (isFailed) {
        // Add failure element
        const errorMessage = subtask.error || 'Test failed';
        lines.push(`    <failure type="AssertionError" message="${this.escapeXml(errorMessage)}">`);
        lines.push(`${this.escapeXml(errorMessage)}`);
        lines.push('    </failure>');
      } else if (isSkipped) {
        // Add skipped element
        const skipMessage = subtask.error || 'Test skipped';
        lines.push(`    <skipped message="${this.escapeXml(skipMessage)}">`);
        lines.push(`${this.escapeXml(skipMessage)}`);
        lines.push('    </skipped>');
      }

      // Close testcase
      lines.push('  </testcase>');
    }

    return lines.join('\n');
  }

  /**
   * Escape XML special characters
   *
   * @param text - Text to escape
   * @returns Escaped XML text
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
