import { IReporter, ExecutionReport, SubtaskReport } from './IReporter';
import { TaskStatus } from '../../domain/enums/TaskStatus';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * HTML Reporter - generates interactive HTML test reports
 *
 * Use cases:
 * - Human-readable test reports
 * - Visual dashboard with charts
 * - Interactive browsing of test results
 * - Screenshot galleries
 *
 * Output format: Self-contained HTML with embedded CSS
 */
export class HTMLReporter implements IReporter {
  public readonly name = 'HTML';
  public readonly fileExtension = 'html';

  /**
   * Generate HTML report as a string
   *
   * @param report - Execution report data
   * @returns Promise resolving to formatted HTML string
   */
  public async generate(report: ExecutionReport): Promise<string> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(report.testName)} - Test Report</title>
  ${this.generateStyles()}
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>${this.escapeHtml(report.testName)}</h1>
      <div class="status ${report.success ? 'status-passed' : 'status-failed'}">
        ${report.success ? 'PASSED' : 'FAILED'}
      </div>
    </header>

    ${this.generateDashboard(report)}
    ${this.generateSummary(report)}
    ${this.generateSubtasks(report)}
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Write HTML report to a file
   *
   * @param report - Execution report data
   * @param outputPath - Path where report should be written
   * @returns Promise resolving when file is written
   */
  public async writeToFile(report: ExecutionReport, outputPath: string): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Generate HTML content
    const html = await this.generate(report);

    // Write to file
    await fs.writeFile(outputPath, html, 'utf-8');
  }

  /**
   * Generate embedded CSS styles
   *
   * @returns Style tag with embedded CSS
   */
  private generateStyles(): string {
    return `<style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h1 {
      font-size: 28px;
      color: #2c3e50;
      margin: 0;
    }

    .status {
      font-size: 20px;
      font-weight: bold;
      padding: 10px 20px;
      border-radius: 5px;
    }

    .status-passed {
      background: #d4edda;
      color: #155724;
    }

    .status-failed {
      background: #f8d7da;
      color: #721c24;
    }

    .dashboard {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }

    .dashboard h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #2c3e50;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
    }

    .stat-card {
      padding: 15px;
      border-radius: 5px;
      text-align: center;
    }

    .stat-card .label {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }

    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
    }

    .stat-total { background: #e3f2fd; color: #1976d2; }
    .stat-passed { background: #e8f5e9; color: #388e3c; }
    .stat-failed { background: #ffebee; color: #d32f2f; }
    .stat-blocked { background: #fff3e0; color: #f57c00; }
    .stat-duration { background: #f3e5f5; color: #7b1fa2; }

    .progress-bar {
      height: 30px;
      background: #e0e0e0;
      border-radius: 15px;
      overflow: hidden;
      margin-top: 20px;
      position: relative;
    }

    .progress-segment {
      height: 100%;
      float: left;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    }

    .progress-passed { background: #4caf50; }
    .progress-failed { background: #f44336; }
    .progress-blocked { background: #ff9800; }

    .summary {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }

    .summary h2 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #2c3e50;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      background: #f9f9f9;
      border-radius: 5px;
    }

    .subtasks {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .subtasks h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #2c3e50;
    }

    .subtask {
      border: 1px solid #e0e0e0;
      border-radius: 5px;
      margin-bottom: 15px;
      overflow: hidden;
    }

    .subtask-header {
      padding: 15px;
      background: #fafafa;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .subtask-header:hover {
      background: #f5f5f5;
    }

    .subtask-title {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }

    .subtask-badge {
      padding: 5px 10px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .badge-completed { background: #d4edda; color: #155724; }
    .badge-failed { background: #f8d7da; color: #721c24; }
    .badge-blocked { background: #fff3cd; color: #856404; }
    .badge-pending { background: #d1ecf1; color: #0c5460; }
    .badge-in-progress { background: #e2e3e5; color: #383d41; }

    .subtask-info {
      display: flex;
      gap: 15px;
      font-size: 14px;
      color: #666;
    }

    .subtask-details {
      padding: 15px;
      background: white;
      border-top: 1px solid #e0e0e0;
    }

    .detail-section {
      margin-bottom: 15px;
    }

    .detail-section:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      font-weight: bold;
      color: #555;
      margin-bottom: 5px;
    }

    .detail-content {
      padding: 10px;
      background: #f9f9f9;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .error-content {
      background: #fff5f5;
      color: #c53030;
    }

    .screenshots {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }

    .screenshot {
      color: #1976d2;
      padding: 10px;
      background: #f0f0f0;
      border-radius: 5px;
      text-decoration: none;
      text-align: center;
      font-size: 12px;
      word-break: break-all;
    }

    .screenshot:hover {
      background: #e0e0e0;
    }

    details {
      cursor: pointer;
    }

    summary {
      outline: none;
      user-select: none;
    }

    @media (max-width: 768px) {
      .container {
        padding: 10px;
      }

      .header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }

      .stats {
        grid-template-columns: 1fr;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .subtask-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
    }
  </style>`;
  }

  /**
   * Generate dashboard section with visual indicators
   *
   * @param report - Execution report
   * @returns HTML string for dashboard
   */
  private generateDashboard(report: ExecutionReport): string {
    const passedPercent =
      report.totalSubtasks > 0 ? (report.passed / report.totalSubtasks) * 100 : 0;
    const failedPercent =
      report.totalSubtasks > 0 ? (report.failed / report.totalSubtasks) * 100 : 0;
    const blockedPercent =
      report.totalSubtasks > 0 ? (report.blocked / report.totalSubtasks) * 100 : 0;

    return `<section class="dashboard">
    <h2>Dashboard Overview</h2>
    <div class="stats">
      <div class="stat-card stat-total">
        <div class="label">Total</div>
        <div class="value">${report.totalSubtasks}</div>
      </div>
      <div class="stat-card stat-passed">
        <div class="label">Passed</div>
        <div class="value">${report.passed}</div>
      </div>
      <div class="stat-card stat-failed">
        <div class="label">Failed</div>
        <div class="value">${report.failed}</div>
      </div>
      <div class="stat-card stat-blocked">
        <div class="label">Blocked</div>
        <div class="value">${report.blocked}</div>
      </div>
      <div class="stat-card stat-duration">
        <div class="label">Duration</div>
        <div class="value">${report.duration}ms</div>
      </div>
    </div>
    <div class="progress-bar">
      ${passedPercent > 0 ? `<div class="progress-segment progress-passed" style="width: ${passedPercent}%">${Math.round(passedPercent)}%</div>` : ''}
      ${failedPercent > 0 ? `<div class="progress-segment progress-failed" style="width: ${failedPercent}%">${Math.round(failedPercent)}%</div>` : ''}
      ${blockedPercent > 0 ? `<div class="progress-segment progress-blocked" style="width: ${blockedPercent}%">${Math.round(blockedPercent)}%</div>` : ''}
    </div>
  </section>`;
  }

  /**
   * Generate summary section
   *
   * @param report - Execution report
   * @returns HTML string for summary
   */
  private generateSummary(report: ExecutionReport): string {
    return `<section class="summary">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <span>Start Time</span>
        <span>${this.formatTimestamp(report.startTime)}</span>
      </div>
      <div class="summary-item">
        <span>End Time</span>
        <span>${this.formatTimestamp(report.endTime)}</span>
      </div>
      <div class="summary-item">
        <span>Duration</span>
        <span>${report.duration}ms</span>
      </div>
      <div class="summary-item">
        <span>Success Rate</span>
        <span>${this.calculateSuccessRate(report)}%</span>
      </div>
    </div>
  </section>`;
  }

  /**
   * Generate subtasks section
   *
   * @param report - Execution report
   * @returns HTML string for subtasks
   */
  private generateSubtasks(report: ExecutionReport): string {
    const subtasksHtml = report.subtaskReports
      .map((subtask) => this.generateSubtask(subtask))
      .join('\n');

    return `<section class="subtasks">
    <h2>Subtasks (${report.subtaskReports.length})</h2>
    ${subtasksHtml}
  </section>`;
  }

  /**
   * Generate HTML for a single subtask
   *
   * @param subtask - Subtask report
   * @returns HTML string for subtask
   */
  private generateSubtask(subtask: SubtaskReport): string {
    const statusClass = this.getStatusClass(subtask.status);
    const statusLabel = this.getStatusLabel(subtask.status);
    const durationText = subtask.duration !== undefined ? `${subtask.duration}ms` : 'N/A';
    const timestampText = subtask.timestamp
      ? this.formatTimestamp(subtask.timestamp)
      : 'N/A';

    return `<details class="subtask">
    <summary class="subtask-header">
      <div class="subtask-title">
        <span class="subtask-badge badge-${statusClass}">${statusLabel}</span>
        <span>${this.escapeHtml(subtask.description)}</span>
      </div>
      <div class="subtask-info">
        <span>⏱ ${durationText}</span>
        <span>🕐 ${timestampText}</span>
      </div>
    </summary>
    <div class="subtask-details">
      ${this.generateSubtaskDetails(subtask)}
    </div>
  </details>`;
  }

  /**
   * Generate detailed content for a subtask
   *
   * @param subtask - Subtask report
   * @returns HTML string for subtask details
   */
  private generateSubtaskDetails(subtask: SubtaskReport): string {
    const sections: string[] = [];

    // Add ID section
    sections.push(`<div class="detail-section">
      <div class="detail-label">ID:</div>
      <div class="detail-content">${this.escapeHtml(subtask.id)}</div>
    </div>`);

    // Add error section if present
    if (subtask.error) {
      sections.push(`<div class="detail-section">
        <div class="detail-label">Error:</div>
        <div class="detail-content error-content">${this.escapeHtml(subtask.error)}</div>
      </div>`);
    }

    // Add output section if present
    if (subtask.output) {
      sections.push(`<div class="detail-section">
        <div class="detail-label">Output:</div>
        <div class="detail-content">${this.escapeHtml(subtask.output)}</div>
      </div>`);
    }

    // Add screenshots section if present
    if (subtask.screenshots && subtask.screenshots.length > 0) {
      const screenshotsHtml = subtask.screenshots
        .map(
          (screenshot) =>
            `<a href="${this.escapeHtml(screenshot)}" class="screenshot" target="_blank">${this.escapeHtml(screenshot)}</a>`,
        )
        .join('');

      sections.push(`<div class="detail-section">
        <div class="detail-label">Screenshots (${subtask.screenshots.length}):</div>
        <div class="screenshots">${screenshotsHtml}</div>
      </div>`);
    }

    return sections.join('\n');
  }

  /**
   * Get CSS class for task status
   *
   * @param status - Task status
   * @returns CSS class name
   */
  private getStatusClass(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.Completed:
        return 'completed';
      case TaskStatus.Failed:
        return 'failed';
      case TaskStatus.Blocked:
        return 'blocked';
      case TaskStatus.Pending:
        return 'pending';
      case TaskStatus.InProgress:
        return 'in-progress';
      default:
        return 'pending';
    }
  }

  /**
   * Get human-readable label for task status
   *
   * @param status - Task status
   * @returns Status label
   */
  private getStatusLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.Completed:
        return 'Completed';
      case TaskStatus.Failed:
        return 'Failed';
      case TaskStatus.Blocked:
        return 'Blocked';
      case TaskStatus.Pending:
        return 'Pending';
      case TaskStatus.InProgress:
        return 'In Progress';
      default:
        return 'Unknown';
    }
  }

  /**
   * Format timestamp to readable string
   *
   * @param date - Date to format
   * @returns Formatted date string
   */
  private formatTimestamp(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Calculate success rate percentage
   *
   * @param report - Execution report
   * @returns Success rate as percentage string
   */
  private calculateSuccessRate(report: ExecutionReport): string {
    if (report.totalSubtasks === 0) {
      return '0';
    }
    const rate = (report.passed / report.totalSubtasks) * 100;
    return rate.toFixed(1);
  }

  /**
   * Escape HTML special characters
   *
   * @param text - Text to escape
   * @returns Escaped HTML text
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
