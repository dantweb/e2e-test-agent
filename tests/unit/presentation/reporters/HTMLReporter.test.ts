import { HTMLReporter } from '../../../../src/presentation/reporters/HTMLReporter';
import { ExecutionReport, SubtaskReport } from '../../../../src/presentation/reporters/IReporter';
import { TaskStatus } from '../../../../src/domain/enums/TaskStatus';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('HTMLReporter', () => {
  let reporter: HTMLReporter;
  let mockReport: ExecutionReport;
  let tempDir: string;

  beforeEach(async () => {
    reporter = new HTMLReporter();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'html-reporter-test-'));

    const subtasks: SubtaskReport[] = [
      {
        id: 'sub-1',
        description: 'Navigate to homepage',
        status: TaskStatus.Completed,
        duration: 1500,
        output: 'Navigation successful',
        timestamp: new Date('2025-11-14T10:00:00Z'),
      },
      {
        id: 'sub-2',
        description: 'Click login button',
        status: TaskStatus.Completed,
        duration: 800,
        screenshots: ['/tmp/screenshot1.png', '/tmp/screenshot2.png'],
        timestamp: new Date('2025-11-14T10:00:02Z'),
      },
      {
        id: 'sub-3',
        description: 'Fill username field',
        status: TaskStatus.Failed,
        duration: 500,
        error: 'Element not found: #username',
        output: 'Failed to locate username input',
        screenshots: ['/tmp/error.png'],
        timestamp: new Date('2025-11-14T10:00:03Z'),
      },
      {
        id: 'sub-4',
        description: 'Wait for API response',
        status: TaskStatus.Blocked,
        error: 'Blocked: Previous step failed',
        timestamp: new Date('2025-11-14T10:00:04Z'),
      },
    ];

    mockReport = {
      testName: 'Login Flow Test',
      startTime: new Date('2025-11-14T10:00:00Z'),
      endTime: new Date('2025-11-14T10:00:05Z'),
      duration: 5000,
      totalSubtasks: 4,
      passed: 2,
      failed: 1,
      blocked: 1,
      subtaskReports: subtasks,
      success: false,
    };
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(reporter.name).toBe('HTML');
    });

    it('should have correct file extension', () => {
      expect(reporter.fileExtension).toBe('html');
    });
  });

  describe('generate', () => {
    it('should generate valid HTML string', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toBeTruthy();
      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should include HTML5 doctype', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toMatch(/^<!DOCTYPE html>/i);
    });

    it('should include test name in title', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('<title>');
      expect(html).toContain('Login Flow Test');
    });

    it('should include embedded CSS styles', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
    });

    it('should include meta charset', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('charset="UTF-8"');
    });

    it('should include meta viewport', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('name="viewport"');
    });

    it('should include test name in header', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('<h1');
      expect(html).toContain('Login Flow Test');
    });

    it('should include summary statistics', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('Total');
      expect(html).toContain('4');
      expect(html).toContain('Passed');
      expect(html).toContain('2');
      expect(html).toContain('Failed');
      expect(html).toContain('1');
      expect(html).toContain('Blocked');
    });

    it('should include duration', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('Duration');
      expect(html).toContain('5000ms');
    });

    it('should show success/failure status', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('FAILED');
    });

    it('should show PASSED for successful reports', async () => {
      const successReport: ExecutionReport = {
        ...mockReport,
        passed: 4,
        failed: 0,
        blocked: 0,
        success: true,
        subtaskReports: mockReport.subtaskReports.map(st => ({
          ...st,
          status: TaskStatus.Completed,
          error: undefined,
        })),
      };

      const html = await reporter.generate(successReport);

      expect(html).toContain('PASSED');
    });

    it('should include all subtasks', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('Navigate to homepage');
      expect(html).toContain('Click login button');
      expect(html).toContain('Fill username field');
      expect(html).toContain('Wait for API response');
    });

    it('should show subtask status indicators', async () => {
      const html = await reporter.generate(mockReport);

      // Should have status badges or indicators
      expect(html).toMatch(/status|badge|indicator/i);
    });

    it('should include subtask durations', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('1500ms');
      expect(html).toContain('800ms');
      expect(html).toContain('500ms');
    });

    it('should show error messages for failed subtasks', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('Element not found: #username');
    });

    it('should show output for subtasks', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('Navigation successful');
      expect(html).toContain('Failed to locate username input');
    });

    it('should include screenshot links', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('/tmp/screenshot1.png');
      expect(html).toContain('/tmp/screenshot2.png');
      expect(html).toContain('/tmp/error.png');
    });

    it('should include timestamps', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('2025-11-14');
      expect(html).toContain('10:00:00');
    });

    it('should include start and end times', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('Start');
      expect(html).toContain('End');
    });

    it('should escape HTML special characters', async () => {
      const reportWithSpecialChars: ExecutionReport = {
        ...mockReport,
        testName: 'Test with <script>alert("XSS")</script>',
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'Click <button> & verify',
            status: TaskStatus.Failed,
            error: 'Error: <div> not found & timeout',
            output: 'Output with <tags> & "quotes"',
          },
        ],
      };

      const html = await reporter.generate(reportWithSpecialChars);

      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
      expect(html).not.toContain('<script>alert'); // Should be escaped
    });

    it('should include collapsible sections for subtasks', async () => {
      const html = await reporter.generate(mockReport);

      // Should have some form of expandable/collapsible UI
      expect(html).toMatch(/details|collapse|expand|toggle/i);
    });

    it('should include summary dashboard section', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toMatch(/dashboard|summary|overview/i);
    });

    it('should format HTML with proper structure', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
    });

    it('should handle report with no subtasks', async () => {
      const emptyReport: ExecutionReport = {
        testName: 'Empty Test',
        startTime: new Date('2025-11-14T10:00:00Z'),
        endTime: new Date('2025-11-14T10:00:01Z'),
        duration: 1000,
        totalSubtasks: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        subtaskReports: [],
        success: true,
      };

      const html = await reporter.generate(emptyReport);

      expect(html).toContain('Empty Test');
      expect(html).toContain('0');
    });

    it('should handle subtasks without optional fields', async () => {
      const minimalReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'Minimal subtask',
            status: TaskStatus.Pending,
          },
        ],
      };

      const html = await reporter.generate(minimalReport);

      expect(html).toContain('Minimal subtask');
      expect(html).toContain('Pending');
    });

    it('should handle very long test names', async () => {
      const longName = 'A'.repeat(200);
      const longReport: ExecutionReport = {
        ...mockReport,
        testName: longName,
      };

      const html = await reporter.generate(longReport);

      expect(html).toContain(longName);
    });

    it('should include responsive design meta tags', async () => {
      const html = await reporter.generate(mockReport);

      expect(html).toMatch(/viewport.*width=device-width/i);
    });
  });

  describe('writeToFile', () => {
    it('should write HTML to file', async () => {
      const outputPath = path.join(tempDir, 'report.html');

      await reporter.writeToFile(mockReport, outputPath);

      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should write valid HTML content', async () => {
      const outputPath = path.join(tempDir, 'report.html');

      await reporter.writeToFile(mockReport, outputPath);

      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('Login Flow Test');
    });

    it('should create directory if it does not exist', async () => {
      const outputPath = path.join(tempDir, 'nested', 'dir', 'report.html');

      await reporter.writeToFile(mockReport, outputPath);

      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should overwrite existing file', async () => {
      const outputPath = path.join(tempDir, 'report.html');

      await reporter.writeToFile(mockReport, outputPath);

      const newReport: ExecutionReport = {
        ...mockReport,
        testName: 'Updated Test Name',
      };

      await reporter.writeToFile(newReport, outputPath);

      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('Updated Test Name');
      expect(content).not.toContain('Login Flow Test');
    });

    it('should throw error for invalid path', async () => {
      const filePath = path.join(tempDir, 'blocking-file');
      await fs.writeFile(filePath, 'content');

      const invalidPath = path.join(filePath, 'subdir', 'report.html');

      await expect(reporter.writeToFile(mockReport, invalidPath)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle subtasks with multiple screenshots', async () => {
      const multiScreenshotReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'Multi-screenshot subtask',
            status: TaskStatus.Completed,
            screenshots: ['/tmp/screenshot1.png', '/tmp/screenshot2.png', '/tmp/screenshot3.png'],
          },
        ],
      };

      const html = await reporter.generate(multiScreenshotReport);

      expect(html).toContain('/tmp/screenshot1.png');
      expect(html).toContain('/tmp/screenshot2.png');
      expect(html).toContain('/tmp/screenshot3.png');
    });

    it('should handle empty screenshot array', async () => {
      const noScreenshotReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'No screenshots',
            status: TaskStatus.Completed,
            screenshots: [],
          },
        ],
      };

      const html = await reporter.generate(noScreenshotReport);

      expect(html).toContain('No screenshots');
    });

    it('should handle very long error messages', async () => {
      const longError = 'Error: ' + 'A'.repeat(1000);
      const longErrorReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'Subtask with long error',
            status: TaskStatus.Failed,
            error: longError,
          },
        ],
      };

      const html = await reporter.generate(longErrorReport);

      expect(html).toContain(longError);
    });

    it('should handle pending subtasks', async () => {
      const pendingReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'Pending subtask',
            status: TaskStatus.Pending,
          },
        ],
      };

      const html = await reporter.generate(pendingReport);

      expect(html).toContain('Pending');
    });

    it('should handle in-progress subtasks', async () => {
      const inProgressReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'In-progress subtask',
            status: TaskStatus.InProgress,
          },
        ],
      };

      const html = await reporter.generate(inProgressReport);

      expect(html).toContain('In Progress');
    });
  });

  describe('styling and presentation', () => {
    it('should include color-coded status indicators', async () => {
      const html = await reporter.generate(mockReport);

      // Should have CSS classes or inline styles for status colors
      expect(html).toMatch(/color|background|class="(passed|failed|blocked)"/i);
    });

    it('should include progress bar or visual indicator', async () => {
      const html = await reporter.generate(mockReport);

      // Should have some form of visual progress indication
      expect(html).toMatch(/progress|chart|graph|percent/i);
    });

    it('should be self-contained (embedded CSS)', async () => {
      const html = await reporter.generate(mockReport);

      // Should not reference external CSS files
      expect(html).not.toMatch(/<link.*stylesheet/i);
      expect(html).toContain('<style>');
    });
  });
});
