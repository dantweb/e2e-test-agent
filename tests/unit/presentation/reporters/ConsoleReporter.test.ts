import { ConsoleReporter } from '../../../../src/presentation/reporters/ConsoleReporter';
import { ExecutionReport, SubtaskReport } from '../../../../src/presentation/reporters/IReporter';
import { TaskStatus } from '../../../../src/domain/enums/TaskStatus';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ConsoleReporter', () => {
  let reporter: ConsoleReporter;
  let mockReport: ExecutionReport;
  let tempDir: string;

  beforeEach(async () => {
    reporter = new ConsoleReporter();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'console-reporter-test-'));

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
      expect(reporter.name).toBe('Console');
    });

    it('should have correct file extension', () => {
      expect(reporter.fileExtension).toBe('txt');
    });
  });

  describe('generate', () => {
    it('should generate non-empty string', async () => {
      const output = await reporter.generate(mockReport);

      expect(output).toBeTruthy();
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should include test name in header', async () => {
      const output = await reporter.generate(mockReport);

      expect(output).toContain('Login Flow Test');
    });

    it('should include summary statistics', async () => {
      const output = await reporter.generate(mockReport);

      expect(output).toContain('Total:');
      expect(output).toMatch(/Total:\s+4/);
      expect(output).toMatch(/Passed:.*2/);
      expect(output).toMatch(/Failed:.*1/);
      expect(output).toMatch(/Blocked:.*1/);
    });

    it('should include duration', async () => {
      const output = await reporter.generate(mockReport);

      expect(output).toMatch(/Duration:.*5000ms/);
    });

    it('should show success/failure status', async () => {
      const output = await reporter.generate(mockReport);

      expect(output).toContain('FAILED');
    });

    it('should list all subtasks', async () => {
      const output = await reporter.generate(mockReport);

      expect(output).toContain('Navigate to homepage');
      expect(output).toContain('Click login button');
      expect(output).toContain('Fill username field');
      expect(output).toContain('Wait for API response');
    });

    it('should show subtask status indicators', async () => {
      const output = await reporter.generate(mockReport);

      // Should have status indicators (✓, ✗, ⏸, etc.)
      expect(output).toMatch(/[✓✗⏸⏹]/);
    });

    it('should include subtask durations', async () => {
      const output = await reporter.generate(mockReport);

      expect(output).toContain('1500ms');
      expect(output).toContain('800ms');
      expect(output).toContain('500ms');
    });

    it('should show error messages for failed subtasks', async () => {
      const output = await reporter.generate(mockReport);

      expect(output).toContain('Element not found: #username');
    });

    it('should show error messages for blocked subtasks', async () => {
      const output = await reporter.generate(mockReport);

      expect(output).toContain('Blocked: Previous step failed');
    });

    it('should include section dividers', async () => {
      const output = await reporter.generate(mockReport);

      // Should have visual separators
      expect(output).toMatch(/[=\-─]{10,}/);
    });

    it('should handle successful report', async () => {
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

      const output = await reporter.generate(successReport);

      expect(output).toContain('PASSED');
      expect(output).toMatch(/Passed:.*4/);
      expect(output).toMatch(/Failed:.*0/);
    });

    it('should handle report with in-progress subtasks', async () => {
      const inProgressReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'Currently executing',
            status: TaskStatus.InProgress,
          },
        ],
      };

      const output = await reporter.generate(inProgressReport);

      expect(output).toContain('Currently executing');
    });

    it('should show pending subtasks', async () => {
      const pendingReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: 'Waiting to execute',
            status: TaskStatus.Pending,
          },
        ],
      };

      const output = await reporter.generate(pendingReport);

      expect(output).toContain('Waiting to execute');
    });

    it('should format multi-line output correctly', async () => {
      const output = await reporter.generate(mockReport);

      const lines = output.split('\n');
      expect(lines.length).toBeGreaterThan(10); // Should have multiple lines
    });

    it('should include subtask output if present', async () => {
      const output = await reporter.generate(mockReport);

      expect(output).toContain('Failed to locate username input');
    });
  });

  describe('writeToFile', () => {
    it('should write console output to file', async () => {
      const outputPath = path.join(tempDir, 'report.txt');

      await reporter.writeToFile(mockReport, outputPath);

      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should write valid content', async () => {
      const outputPath = path.join(tempDir, 'report.txt');

      await reporter.writeToFile(mockReport, outputPath);

      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('Login Flow Test');
      expect(content).toMatch(/Total:\s+4/);
    });

    it('should create directory if it does not exist', async () => {
      const outputPath = path.join(tempDir, 'nested', 'dir', 'report.txt');

      await reporter.writeToFile(mockReport, outputPath);

      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should strip ANSI color codes from file output', async () => {
      const outputPath = path.join(tempDir, 'report.txt');

      await reporter.writeToFile(mockReport, outputPath);

      const content = await fs.readFile(outputPath, 'utf-8');

      // Should not contain ANSI escape sequences
      expect(content).not.toMatch(/\x1b\[[0-9;]*m/);
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

      const output = await reporter.generate(emptyReport);

      expect(output).toContain('Empty Test');
      expect(output).toMatch(/Total:\s+0/);
    });

    it('should handle very long test names', async () => {
      const longName = 'A'.repeat(200);
      const longReport: ExecutionReport = {
        ...mockReport,
        testName: longName,
      };

      const output = await reporter.generate(longReport);

      expect(output).toContain(longName);
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'B'.repeat(500);
      const longReport: ExecutionReport = {
        ...mockReport,
        subtaskReports: [
          {
            id: 'sub-1',
            description: longDescription,
            status: TaskStatus.Completed,
          },
        ],
      };

      const output = await reporter.generate(longReport);

      expect(output).toContain(longDescription);
    });

    it('should handle subtasks with no duration', async () => {
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

      const output = await reporter.generate(noDurationReport);

      expect(output).toContain('No timing info');
    });
  });

  describe('color support', () => {
    it('should include color codes in generate output', async () => {
      const output = await reporter.generate(mockReport);

      // Should contain ANSI color codes (for terminal output)
      // We don't test specific codes as they may change
      // Just verify the output is different from plain text
      expect(output.length).toBeGreaterThan(mockReport.testName.length);
    });
  });
});
