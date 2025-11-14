import { JUnitReporter } from '../../../../src/presentation/reporters/JUnitReporter';
import { ExecutionReport, SubtaskReport } from '../../../../src/presentation/reporters/IReporter';
import { TaskStatus } from '../../../../src/domain/enums/TaskStatus';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('JUnitReporter', () => {
  let reporter: JUnitReporter;
  let mockReport: ExecutionReport;
  let tempDir: string;

  beforeEach(async () => {
    reporter = new JUnitReporter();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'junit-reporter-test-'));

    const subtasks: SubtaskReport[] = [
      {
        id: 'sub-1',
        description: 'Navigate to homepage',
        status: TaskStatus.Completed,
        duration: 1500,
        timestamp: new Date('2025-11-14T10:00:00Z'),
      },
      {
        id: 'sub-2',
        description: 'Click login button',
        status: TaskStatus.Completed,
        duration: 800,
        timestamp: new Date('2025-11-14T10:00:02Z'),
      },
      {
        id: 'sub-3',
        description: 'Fill username field',
        status: TaskStatus.Failed,
        duration: 500,
        error: 'Element not found: #username',
        output: 'Failed to locate username input',
        timestamp: new Date('2025-11-14T10:00:03Z'),
      },
    ];

    mockReport = {
      testName: 'Login Flow Test',
      startTime: new Date('2025-11-14T10:00:00Z'),
      endTime: new Date('2025-11-14T10:00:05Z'),
      duration: 5000,
      totalSubtasks: 3,
      passed: 2,
      failed: 1,
      blocked: 0,
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
      expect(reporter.name).toBe('JUnit');
    });

    it('should have correct file extension', () => {
      expect(reporter.fileExtension).toBe('xml');
    });
  });

  describe('generate', () => {
    it('should generate valid XML string', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toBeTruthy();
      expect(typeof xml).toBe('string');
      expect(xml).toContain('<?xml');
      expect(xml).toContain('<testsuite');
      expect(xml).toContain('</testsuite>');
    });

    it('should include XML declaration', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    });

    it('should include testsuite with test name', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toContain('name="Login Flow Test"');
    });

    it('should include test counts', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toContain('tests="3"');
      expect(xml).toContain('failures="1"');
    });

    it('should include timing information', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toContain('time="5.000"'); // Convert ms to seconds
    });

    it('should include timestamp', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toContain('timestamp="2025-11-14T10:00:00');
    });

    it('should include testcase for each subtask', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toContain('name="Navigate to homepage"');
      expect(xml).toContain('name="Click login button"');
      expect(xml).toContain('name="Fill username field"');
    });

    it('should include classname in testcases', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toContain('classname="Login Flow Test"');
    });

    it('should include duration for each testcase', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toContain('time="1.500"'); // 1500ms = 1.5s
      expect(xml).toContain('time="0.800"'); // 800ms = 0.8s
      expect(xml).toContain('time="0.500"'); // 500ms = 0.5s
    });

    it('should include failure element for failed tests', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toContain('<failure');
      expect(xml).toContain('Element not found: #username');
      expect(xml).toContain('</failure>');
    });

    it('should include failure type', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toContain('type="AssertionError"');
    });

    it('should include failure message', async () => {
      const xml = await reporter.generate(mockReport);

      expect(xml).toContain('message="Element not found: #username"');
    });

    it('should escape XML special characters', async () => {
      const reportWithSpecialChars: ExecutionReport = {
        ...mockReport,
        testName: 'Test with <special> & "chars"',
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'Click <button> & verify',
            status: TaskStatus.Failed,
            error: 'Error: <div> not found & timeout',
          },
        ],
      };

      const xml = await reporter.generate(reportWithSpecialChars);

      expect(xml).toContain('&lt;special&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;');
      expect(xml).not.toContain('<special>'); // Should be escaped
    });

    it('should handle successful report with all passed tests', async () => {
      const successReport: ExecutionReport = {
        ...mockReport,
        passed: 3,
        failed: 0,
        success: true,
        subtaskReports: mockReport.subtaskReports.map(st => ({
          ...st,
          status: TaskStatus.Completed,
          error: undefined,
        })),
      };

      const xml = await reporter.generate(successReport);

      expect(xml).toContain('failures="0"');
      expect(xml).not.toContain('<failure');
    });

    it('should handle blocked subtasks as skipped', async () => {
      const blockedReport: ExecutionReport = {
        ...mockReport,
        blocked: 1,
        subtaskReports: [
          ...mockReport.subtaskReports.slice(0, 2),
          {
            id: 'sub-3',
            description: 'Validate cart',
            status: TaskStatus.Blocked,
            error: 'Blocked: Dependencies not met',
          },
        ],
      };

      const xml = await reporter.generate(blockedReport);

      expect(xml).toContain('<skipped');
      expect(xml).toContain('Dependencies not met');
    });

    it('should handle pending subtasks as skipped', async () => {
      const pendingReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'Not executed yet',
            status: TaskStatus.Pending,
          },
        ],
      };

      const xml = await reporter.generate(pendingReport);

      expect(xml).toContain('<skipped');
    });

    it('should format XML with proper indentation', async () => {
      const xml = await reporter.generate(mockReport);

      // Should have multiple lines (pretty-printed)
      const lines = xml.split('\n');
      expect(lines.length).toBeGreaterThan(5);

      // Should have indentation
      expect(xml).toMatch(/\n  </); // 2-space indent
    });
  });

  describe('writeToFile', () => {
    it('should write XML to file', async () => {
      const outputPath = path.join(tempDir, 'junit.xml');

      await reporter.writeToFile(mockReport, outputPath);

      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should write valid XML content', async () => {
      const outputPath = path.join(tempDir, 'junit.xml');

      await reporter.writeToFile(mockReport, outputPath);

      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('<?xml');
      expect(content).toContain('<testsuite');
      expect(content).toContain('name="Login Flow Test"');
    });

    it('should create directory if it does not exist', async () => {
      const outputPath = path.join(tempDir, 'nested', 'dir', 'junit.xml');

      await reporter.writeToFile(mockReport, outputPath);

      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should overwrite existing file', async () => {
      const outputPath = path.join(tempDir, 'junit.xml');

      await reporter.writeToFile(mockReport, outputPath);

      const newReport: ExecutionReport = {
        ...mockReport,
        testName: 'Updated Test',
      };

      await reporter.writeToFile(newReport, outputPath);

      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('Updated Test');
    });

    it('should throw error for invalid path', async () => {
      const filePath = path.join(tempDir, 'blocking-file');
      await fs.writeFile(filePath, 'content');

      const invalidPath = path.join(filePath, 'subdir', 'junit.xml');

      await expect(reporter.writeToFile(mockReport, invalidPath)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle report with no subtasks', async () => {
      const emptyReport: ExecutionReport = {
        testName: 'Empty Test',
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        totalSubtasks: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        subtaskReports: [],
        success: true,
      };

      const xml = await reporter.generate(emptyReport);

      expect(xml).toContain('tests="0"');
      expect(xml).toContain('failures="0"');
    });

    it('should handle subtask without duration', async () => {
      const noDurationReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'No timing info',
            status: TaskStatus.Completed,
          },
        ],
      };

      const xml = await reporter.generate(noDurationReport);

      expect(xml).toContain('time="0.000"');
    });

    it('should handle very long test names', async () => {
      const longName = 'A'.repeat(500);
      const longReport: ExecutionReport = {
        ...mockReport,
        testName: longName,
      };

      const xml = await reporter.generate(longReport);

      expect(xml).toContain(longName);
    });

    it('should handle subtasks with output but no error', async () => {
      const outputReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'Has output',
            status: TaskStatus.Completed,
            output: 'Detailed output information',
          },
        ],
      };

      const xml = await reporter.generate(outputReport);

      expect(xml).toContain('<testcase');
      expect(xml).not.toContain('<failure');
    });
  });
});
