import { JSONReporter } from '../../../../src/presentation/reporters/JSONReporter';
import { ExecutionReport, SubtaskReport } from '../../../../src/presentation/reporters/IReporter';
import { TaskStatus } from '../../../../src/domain/enums/TaskStatus';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('JSONReporter', () => {
  let reporter: JSONReporter;
  let mockReport: ExecutionReport;
  let tempDir: string;

  beforeEach(async () => {
    reporter = new JSONReporter();

    // Create temp directory for file write tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'json-reporter-test-'));

    // Create mock execution report
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
        screenshots: ['/tmp/screenshot1.png'],
        timestamp: new Date('2025-11-14T10:00:02Z'),
      },
      {
        id: 'sub-3',
        description: 'Fill form',
        status: TaskStatus.Failed,
        duration: 500,
        error: 'Element not found: #username',
        output: 'Failed to locate username input',
        screenshots: ['/tmp/error.png'],
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
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(reporter.name).toBe('JSON');
    });

    it('should have correct file extension', () => {
      expect(reporter.fileExtension).toBe('json');
    });
  });

  describe('generate', () => {
    it('should generate valid JSON string', async () => {
      const json = await reporter.generate(mockReport);

      expect(json).toBeTruthy();
      expect(typeof json).toBe('string');

      // Should be parseable JSON
      const parsed = JSON.parse(json);
      expect(parsed).toBeDefined();
    });

    it('should include test name', async () => {
      const json = await reporter.generate(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.testName).toBe('Login Flow Test');
    });

    it('should include timing information', async () => {
      const json = await reporter.generate(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.startTime).toBe('2025-11-14T10:00:00.000Z');
      expect(parsed.endTime).toBe('2025-11-14T10:00:05.000Z');
      expect(parsed.duration).toBe(5000);
    });

    it('should include summary statistics', async () => {
      const json = await reporter.generate(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.totalSubtasks).toBe(3);
      expect(parsed.passed).toBe(2);
      expect(parsed.failed).toBe(1);
      expect(parsed.blocked).toBe(0);
      expect(parsed.success).toBe(false);
    });

    it('should include all subtasks', async () => {
      const json = await reporter.generate(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.subtaskReports).toHaveLength(3);
    });

    it('should include subtask details', async () => {
      const json = await reporter.generate(mockReport);
      const parsed = JSON.parse(json);

      const firstSubtask = parsed.subtaskReports[0];
      expect(firstSubtask.id).toBe('sub-1');
      expect(firstSubtask.description).toBe('Navigate to homepage');
      expect(firstSubtask.status).toBe('completed');
      expect(firstSubtask.duration).toBe(1500);
      expect(firstSubtask.output).toBe('Navigation successful');
    });

    it('should include error information for failed subtasks', async () => {
      const json = await reporter.generate(mockReport);
      const parsed = JSON.parse(json);

      const failedSubtask = parsed.subtaskReports[2];
      expect(failedSubtask.status).toBe('failed');
      expect(failedSubtask.error).toBe('Element not found: #username');
      expect(failedSubtask.output).toBe('Failed to locate username input');
    });

    it('should include screenshots if present', async () => {
      const json = await reporter.generate(mockReport);
      const parsed = JSON.parse(json);

      const subtaskWithScreenshot = parsed.subtaskReports[1];
      expect(subtaskWithScreenshot.screenshots).toEqual(['/tmp/screenshot1.png']);

      const failedSubtask = parsed.subtaskReports[2];
      expect(failedSubtask.screenshots).toEqual(['/tmp/error.png']);
    });

    it('should format JSON with proper indentation', async () => {
      const json = await reporter.generate(mockReport);

      // Should be pretty-printed (have newlines and indentation)
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should handle report with all passed subtasks', async () => {
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

      const json = await reporter.generate(successReport);
      const parsed = JSON.parse(json);

      expect(parsed.success).toBe(true);
      expect(parsed.passed).toBe(3);
      expect(parsed.failed).toBe(0);
    });

    it('should handle report with blocked subtasks', async () => {
      const blockedReport: ExecutionReport = {
        ...mockReport,
        blocked: 1,
        subtaskReports: [
          ...mockReport.subtaskReports.slice(0, 2),
          {
            id: 'sub-3',
            description: 'Fill form',
            status: TaskStatus.Blocked,
            error: 'Blocked: Dependencies not met',
            timestamp: new Date('2025-11-14T10:00:03Z'),
          },
        ],
      };

      const json = await reporter.generate(blockedReport);
      const parsed = JSON.parse(json);

      expect(parsed.blocked).toBe(1);
      expect(parsed.subtaskReports[2].status).toBe('blocked');
    });
  });

  describe('writeToFile', () => {
    it('should write JSON to file', async () => {
      const outputPath = path.join(tempDir, 'report.json');

      await reporter.writeToFile(mockReport, outputPath);

      // File should exist
      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should write valid JSON content', async () => {
      const outputPath = path.join(tempDir, 'report.json');

      await reporter.writeToFile(mockReport, outputPath);

      // Read and parse file
      const content = await fs.readFile(outputPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.testName).toBe('Login Flow Test');
      expect(parsed.totalSubtasks).toBe(3);
    });

    it('should create directory if it does not exist', async () => {
      const outputPath = path.join(tempDir, 'nested', 'dir', 'report.json');

      await reporter.writeToFile(mockReport, outputPath);

      // File should exist
      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should overwrite existing file', async () => {
      const outputPath = path.join(tempDir, 'report.json');

      // Write first time
      await reporter.writeToFile(mockReport, outputPath);

      // Modify report and write again
      const newReport: ExecutionReport = {
        ...mockReport,
        testName: 'Updated Test Name',
      };

      await reporter.writeToFile(newReport, outputPath);

      // Read and verify
      const content = await fs.readFile(outputPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.testName).toBe('Updated Test Name');
    });

    it('should throw error for invalid path', async () => {
      // Create a file, then try to create a directory with the same name (will fail)
      const filePath = path.join(tempDir, 'blocking-file');
      await fs.writeFile(filePath, 'content');

      // Try to write to a path where a file blocks directory creation
      const invalidPath = path.join(filePath, 'subdir', 'report.json');

      await expect(reporter.writeToFile(mockReport, invalidPath)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
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

      const json = await reporter.generate(emptyReport);
      const parsed = JSON.parse(json);

      expect(parsed.totalSubtasks).toBe(0);
      expect(parsed.subtaskReports).toEqual([]);
    });

    it('should handle subtask with no optional fields', async () => {
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

      const json = await reporter.generate(minimalReport);
      const parsed = JSON.parse(json);

      const subtask = parsed.subtaskReports[0];
      expect(subtask.id).toBe('sub-1');
      expect(subtask.duration).toBeUndefined();
      expect(subtask.error).toBeUndefined();
    });

    it('should handle very long test names and descriptions', async () => {
      const longName = 'A'.repeat(1000);
      const longDescription = 'B'.repeat(2000);

      const longReport: ExecutionReport = {
        ...mockReport,
        testName: longName,
        subtaskReports: [
          {
            id: 'sub-1',
            description: longDescription,
            status: TaskStatus.Completed,
          },
        ],
      };

      const json = await reporter.generate(longReport);
      const parsed = JSON.parse(json);

      expect(parsed.testName).toBe(longName);
      expect(parsed.subtaskReports[0].description).toBe(longDescription);
    });
  });
});
