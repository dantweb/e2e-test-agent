# Sprint 8: CLI & Reports

**Duration**: 1 week (5 days)
**Status**: ⏸️ Not Started
**Dependencies**: All previous sprints

## Goal

Implement CLI commands for compilation and execution, along with HTML and JUnit report generators.

## Tasks

### Day 1-2: CLI Infrastructure

#### Task 1: CLI Application Structure ⏸️

**TDD Approach**:
```typescript
// tests/unit/presentation/CLIApplication.test.ts
describe('CLIApplication', () => {
  it('should parse compile command', () => {
    const cli = new CLIApplication();
    const args = ['compile', '--src=test.yaml', '--output=_generated'];

    const parsed = cli.parseArgs(args);

    expect(parsed.command).toBe('compile');
    expect(parsed.options.src).toBe('test.yaml');
    expect(parsed.options.output).toBe('_generated');
  });

  it('should parse execute command', () => {
    const cli = new CLIApplication();
    const args = ['execute', '_generated'];

    const parsed = cli.parseArgs(args);

    expect(parsed.command).toBe('execute');
    expect(parsed.args[0]).toBe('_generated');
  });

  it('should show help', () => {
    const cli = new CLIApplication();
    const help = cli.getHelp();

    expect(help).toContain('e2e-test-compile');
    expect(help).toContain('e2e-test-run');
  });
});
```

**Implementation** (src/presentation/cli/CLIApplication.ts):
```typescript
import { Command } from 'commander';

export interface ParsedCommand {
  command: string;
  args: string[];
  options: Record<string, any>;
}

export class CLIApplication {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('e2e-tester-agent')
      .description('AI-driven E2E test automation')
      .version('1.0.0');

    this.program
      .command('compile')
      .description('Compile YAML test to oxtest files')
      .requiredOption('--src <file>', 'Source YAML file')
      .requiredOption('--output <dir>', 'Output directory')
      .option('--llm <provider>', 'LLM provider (openai|anthropic)', 'openai')
      .option('--model <name>', 'Model name')
      .action((options) => {
        // Handled by execute()
      });

    this.program
      .command('execute <directory>')
      .description('Execute oxtest files in directory')
      .option('--headless', 'Run browser in headless mode', false)
      .option('--report <format>', 'Report format (html|junit|both)', 'html')
      .option('--output <file>', 'Report output file')
      .action((directory, options) => {
        // Handled by execute()
      });
  }

  parseArgs(args: string[]): ParsedCommand {
    this.program.parse(['node', 'cli', ...args]);

    const command = this.program.args[0];
    const options = this.program.opts();

    return {
      command,
      args: this.program.args.slice(1),
      options
    };
  }

  getHelp(): string {
    return this.program.helpInformation();
  }

  async execute(args: string[]): Promise<void> {
    await this.program.parseAsync(['node', 'cli', ...args]);
  }
}
```

**Acceptance Criteria**:
- [ ] Parse compile command
- [ ] Parse execute command
- [ ] Show help text
- [ ] Validate arguments
- [ ] 100% test coverage

**Estimated Time**: 4 hours

---

#### Task 2: Compile Command Implementation ⏸️

**TDD Approach**:
```typescript
// tests/unit/presentation/CompileCommand.test.ts
describe('CompileCommand', () => {
  let command: CompileCommand;
  let mockFactory: jest.Mocked<ConfigurationFactory>;
  let mockDecomposer: jest.Mocked<TaskDecomposer>;
  let mockWriter: jest.Mocked<OxtestWriter>;

  beforeEach(() => {
    mockFactory = {
      loadFromFile: jest.fn()
    } as any;

    mockDecomposer = {
      decomposeTest: jest.fn()
    } as any;

    mockWriter = {
      writeTask: jest.fn(),
      writeManifest: jest.fn()
    } as any;

    command = new CompileCommand(mockFactory, mockDecomposer, mockWriter);
  });

  it('should compile YAML to oxtest', async () => {
    const config: Config = {
      name: 'Test Suite',
      tests: [
        {
          name: 'Login Test',
          steps: [{ action: 'navigate', prompt: 'Go to site' }],
          validation: { url_contains: '/home' }
        }
      ]
    };

    mockFactory.loadFromFile.mockResolvedValue(config);

    const task = Task.create('task-1', 'Login Test');
    mockDecomposer.decomposeTest.mockResolvedValue(task);

    await command.execute({
      src: 'test.yaml',
      output: '_generated',
      llm: 'openai'
    });

    expect(mockFactory.loadFromFile).toHaveBeenCalledWith('test.yaml');
    expect(mockDecomposer.decomposeTest).toHaveBeenCalled();
    expect(mockWriter.writeTask).toHaveBeenCalled();
    expect(mockWriter.writeManifest).toHaveBeenCalled();
  });

  it('should handle compilation errors', async () => {
    mockFactory.loadFromFile.mockRejectedValue(new Error('Invalid YAML'));

    await expect(
      command.execute({ src: 'bad.yaml', output: '_generated', llm: 'openai' })
    ).rejects.toThrow('Invalid YAML');
  });

  it('should create output directory', async () => {
    mockFactory.loadFromFile.mockResolvedValue({
      name: 'Test',
      tests: []
    } as any);

    await command.execute({
      src: 'test.yaml',
      output: '_generated',
      llm: 'openai'
    });

    // Verify directory creation
    const fs = require('fs/promises');
    const exists = await fs.access('_generated').then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });
});
```

**Implementation** (src/presentation/cli/CompileCommand.ts):
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigurationFactory } from '../../configuration/ConfigurationFactory';
import { TaskDecomposer } from '../../application/engines/TaskDecomposer';
import { OxtestWriter } from '../writers/OxtestWriter';

export interface CompileOptions {
  src: string;
  output: string;
  llm: string;
  model?: string;
}

export class CompileCommand {
  constructor(
    private readonly configFactory: ConfigurationFactory,
    private readonly taskDecomposer: TaskDecomposer,
    private readonly oxtestWriter: OxtestWriter
  ) {}

  async execute(options: CompileOptions): Promise<void> {
    console.log(`Compiling ${options.src}...`);

    // Load config
    const config = await this.configFactory.loadFromFile(options.src);

    // Create output directory
    await fs.mkdir(options.output, { recursive: true });

    // Decompose each test
    const tasks = [];
    for (const test of config.tests) {
      console.log(`  Decomposing: ${test.name}`);
      const task = await this.taskDecomposer.decomposeTest(test);
      tasks.push(task);

      // Write oxtest file
      const filename = this.sanitizeFilename(test.name) + '.ox.test';
      const filepath = path.join(options.output, filename);
      await this.oxtestWriter.writeTask(task, filepath);

      console.log(`    ✓ Generated: ${filename}`);
    }

    // Write manifest
    const manifestPath = path.join(options.output, 'manifest.json');
    await this.oxtestWriter.writeManifest(config, tasks, manifestPath);

    console.log(`\n✅ Compilation complete: ${tasks.length} tests generated`);
  }

  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
```

**Acceptance Criteria**:
- [ ] Load YAML config
- [ ] Decompose tests
- [ ] Write oxtest files
- [ ] Write manifest
- [ ] Create directories
- [ ] Error handling
- [ ] 90% test coverage

**Estimated Time**: 6 hours

---

### Day 3: Execute Command

#### Task 3: Execute Command Implementation ⏸️

**TDD Approach**:
```typescript
// tests/unit/presentation/ExecuteCommand.test.ts
describe('ExecuteCommand', () => {
  let command: ExecuteCommand;
  let mockParser: jest.Mocked<OxtestParser>;
  let mockOrchestrator: jest.Mocked<SequentialExecutionOrchestrator>;
  let mockReporter: jest.Mocked<HTMLReporter>;

  beforeEach(() => {
    mockParser = {
      parseFile: jest.fn()
    } as any;

    mockOrchestrator = {
      executeTask: jest.fn()
    } as any;

    mockReporter = {
      generate: jest.fn()
    } as any;

    command = new ExecuteCommand(mockParser, mockOrchestrator, mockReporter);
  });

  it('should execute oxtest files', async () => {
    const manifest = {
      name: 'Test Suite',
      tests: [
        { id: 'test-1', name: 'Login', oxtestFile: 'login.ox.test', validations: [] }
      ],
      timestamp: new Date().toISOString()
    };

    const commands = [
      OxtestCommand.navigate('https://shop.dev', 1)
    ];

    mockParser.parseFile.mockResolvedValue(commands);

    const completedTask = Task.create('test-1', 'Login').markAsCompleted();
    mockOrchestrator.executeTask.mockResolvedValue(completedTask);

    const result = await command.execute({
      directory: '_generated',
      headless: true,
      report: 'html'
    });

    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('should generate report', async () => {
    const manifest = {
      name: 'Test',
      tests: [
        { id: 'test-1', name: 'Test', oxtestFile: 'test.ox.test', validations: [] }
      ],
      timestamp: new Date().toISOString()
    };

    mockParser.parseFile.mockResolvedValue([]);
    mockOrchestrator.executeTask.mockResolvedValue(
      Task.create('test-1', 'Test').markAsCompleted()
    );

    await command.execute({
      directory: '_generated',
      report: 'html',
      output: 'report.html'
    });

    expect(mockReporter.generate).toHaveBeenCalled();
  });
});
```

**Implementation** (src/presentation/cli/ExecuteCommand.ts):
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { OxtestParser } from '../../infrastructure/parsers/OxtestParser';
import { SequentialExecutionOrchestrator } from '../../application/orchestrators/SequentialExecutionOrchestrator';
import { HTMLReporter } from '../reporters/HTMLReporter';
import { Task } from '../../domain/entities/Task';
import { TaskStatus } from '../../domain/enums';

export interface ExecuteOptions {
  directory: string;
  headless?: boolean;
  report?: 'html' | 'junit' | 'both';
  output?: string;
}

export interface ExecuteResult {
  total: number;
  passed: number;
  failed: number;
  tasks: Task[];
}

export class ExecuteCommand {
  constructor(
    private readonly parser: OxtestParser,
    private readonly orchestrator: SequentialExecutionOrchestrator,
    private readonly reporter: HTMLReporter
  ) {}

  async execute(options: ExecuteOptions): Promise<ExecuteResult> {
    console.log(`Executing tests from ${options.directory}...`);

    // Read manifest
    const manifestPath = path.join(options.directory, 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    const tasks: Task[] = [];
    let passed = 0;
    let failed = 0;

    // Execute each test
    for (const testEntry of manifest.tests) {
      console.log(`\n  Running: ${testEntry.name}`);

      const oxtestPath = path.join(options.directory, testEntry.oxtestFile);
      const commands = await this.parser.parseFile(oxtestPath);

      // Create task with commands
      let task = Task.create(testEntry.id, testEntry.name);
      const subtask = Subtask.create('sub-1', testEntry.name, commands);
      task = task.addSubtask(subtask);

      // Add validations from manifest
      for (const val of testEntry.validations) {
        task = task.addValidation(this.buildValidation(val));
      }

      // Execute
      const result = await this.orchestrator.executeTask(task);
      tasks.push(result);

      if (result.status === TaskStatus.COMPLETED) {
        passed++;
        console.log(`    ✓ Passed`);
      } else {
        failed++;
        console.log(`    ✗ Failed: ${result.error}`);
      }
    }

    // Generate report
    if (options.report) {
      const reportPath = options.output || 'test-report.html';
      await this.reporter.generate(tasks, reportPath);
      console.log(`\n📊 Report generated: ${reportPath}`);
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tests: ${tasks.length} | Passed: ${passed} | Failed: ${failed}`);

    return { total: tasks.length, passed, failed, tasks };
  }

  private buildValidation(val: any): ValidationPredicate {
    // Convert manifest validation to ValidationPredicate
    return {
      type: val.type,
      selector: val.selector ? SelectorSpec.css(val.selector) : undefined,
      expected: val.expected || val.pattern,
      description: `Validation: ${val.type}`
    };
  }
}
```

**Acceptance Criteria**:
- [ ] Read manifest
- [ ] Parse oxtest files
- [ ] Execute tests
- [ ] Track results
- [ ] Generate reports
- [ ] 90% test coverage

**Estimated Time**: 6 hours

---

### Day 4: Report Generators

#### Task 4: HTML Reporter ⏸️

**TDD Approach**:
```typescript
// tests/unit/presentation/HTMLReporter.test.ts
describe('HTMLReporter', () => {
  let reporter: HTMLReporter;

  beforeEach(() => {
    reporter = new HTMLReporter();
  });

  it('should generate HTML report', async () => {
    const tasks = [
      Task.create('task-1', 'Login Test').markAsCompleted(),
      Task.create('task-2', 'Checkout Test').markAsFailed('Error')
    ];

    const html = await reporter.generate(tasks, 'report.html');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Login Test');
    expect(html).toContain('Checkout Test');
    expect(html).toContain('Passed: 1');
    expect(html).toContain('Failed: 1');
  });

  it('should include task details', async () => {
    let task = Task.create('task-1', 'Test');
    const subtask = Subtask.create('sub-1', 'Step', [
      OxtestCommand.navigate('https://shop.dev', 1)
    ]).markAsCompleted();

    task = task.addSubtask(subtask).markAsCompleted();

    const html = await reporter.generate([task], 'report.html');

    expect(html).toContain('https://shop.dev');
    expect(html).toContain('navigate');
  });

  it('should write to file', async () => {
    const tasks = [Task.create('task-1', 'Test').markAsCompleted()];

    await reporter.generate(tasks, 'test-report.html');

    const fs = require('fs/promises');
    const content = await fs.readFile('test-report.html', 'utf-8');

    expect(content).toContain('<!DOCTYPE html>');
  });
});
```

**Implementation** (src/presentation/reporters/HTMLReporter.ts):
```typescript
import * as fs from 'fs/promises';
import { Task } from '../../domain/entities/Task';
import { TaskStatus } from '../../domain/enums';

export class HTMLReporter {
  async generate(tasks: ReadonlyArray<Task>, outputPath: string): Promise<string> {
    const html = this.buildHTML(tasks);
    await fs.writeFile(outputPath, html, 'utf-8');
    return html;
  }

  private buildHTML(tasks: ReadonlyArray<Task>): string {
    const passed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const failed = tasks.filter(t => t.status === TaskStatus.FAILED).length;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>E2E Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
    .passed { color: green; }
    .failed { color: red; }
    .task { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    .task.passed { border-left: 5px solid green; }
    .task.failed { border-left: 5px solid red; }
    .commands { margin-top: 10px; font-family: monospace; background: #f9f9f9; padding: 10px; }
    .command { margin: 5px 0; }
  </style>
</head>
<body>
  <h1>E2E Test Report</h1>

  <div class="summary">
    <h2>Summary</h2>
    <p>Total: ${tasks.length}</p>
    <p class="passed">Passed: ${passed}</p>
    <p class="failed">Failed: ${failed}</p>
  </div>

  <h2>Tests</h2>
  ${tasks.map(task => this.buildTaskHTML(task)).join('\n')}

  <footer>
    <p>Generated: ${new Date().toISOString()}</p>
  </footer>
</body>
</html>
    `.trim();
  }

  private buildTaskHTML(task: Task): string {
    const statusClass = task.status === TaskStatus.COMPLETED ? 'passed' : 'failed';

    return `
  <div class="task ${statusClass}">
    <h3>${task.description} - <span class="${statusClass}">${task.status}</span></h3>
    ${task.error ? `<p class="failed">Error: ${task.error}</p>` : ''}

    ${task.subtasks.map(sub => `
      <div class="commands">
        <strong>${sub.description}</strong>
        ${sub.commands.map(cmd => `
          <div class="command">Line ${cmd.line}: ${cmd.command} ${cmd.selector?.toString() || ''}</div>
        `).join('')}
      </div>
    `).join('')}

    ${task.validations.length > 0 ? `
      <div class="validations">
        <strong>Validations:</strong>
        <ul>
          ${task.validations.map(v => `<li>${v.description}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
  </div>
    `;
  }
}
```

**Acceptance Criteria**:
- [ ] Generate HTML report
- [ ] Include summary
- [ ] Show task details
- [ ] Show commands
- [ ] Write to file
- [ ] 90% test coverage

**Estimated Time**: 4 hours

---

### Day 5: JUnit Reporter

#### Task 5: JUnit Reporter ⏸️

**TDD Approach**:
```typescript
// tests/unit/presentation/JUnitReporter.test.ts
describe('JUnitReporter', () => {
  let reporter: JUnitReporter;

  beforeEach(() => {
    reporter = new JUnitReporter();
  });

  it('should generate JUnit XML', async () => {
    const tasks = [
      Task.create('task-1', 'Login Test').markAsCompleted(),
      Task.create('task-2', 'Failed Test').markAsFailed('Error')
    ];

    const xml = await reporter.generate(tasks, 'junit.xml');

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<testsuite');
    expect(xml).toContain('tests="2"');
    expect(xml).toContain('failures="1"');
    expect(xml).toContain('<testcase name="Login Test"');
    expect(xml).toContain('<failure');
  });
});
```

**Implementation** (src/presentation/reporters/JUnitReporter.ts):
```typescript
import * as fs from 'fs/promises';
import { Task } from '../../domain/entities/Task';
import { TaskStatus } from '../../domain/enums';

export class JUnitReporter {
  async generate(tasks: ReadonlyArray<Task>, outputPath: string): Promise<string> {
    const xml = this.buildXML(tasks);
    await fs.writeFile(outputPath, xml, 'utf-8');
    return xml;
  }

  private buildXML(tasks: ReadonlyArray<Task>): string {
    const failed = tasks.filter(t => t.status === TaskStatus.FAILED).length;

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="E2E Tests" tests="${tasks.length}" failures="${failed}">
${tasks.map(task => this.buildTestCase(task)).join('\n')}
</testsuite>`;
  }

  private buildTestCase(task: Task): string {
    if (task.status === TaskStatus.COMPLETED) {
      return `  <testcase name="${this.escape(task.description)}" />`;
    }

    return `  <testcase name="${this.escape(task.description)}">
    <failure message="${this.escape(task.error || 'Unknown error')}" />
  </testcase>`;
  }

  private escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
```

**Acceptance Criteria**:
- [ ] Generate JUnit XML
- [ ] Include test cases
- [ ] Include failures
- [ ] Proper XML escaping
- [ ] 90% test coverage

**Estimated Time**: 3 hours

---

## Checklist

- [ ] Task 1: CLI application structure
- [ ] Task 2: Compile command
- [ ] Task 3: Execute command
- [ ] Task 4: HTML reporter
- [ ] Task 5: JUnit reporter

## Definition of Done

- ✅ CLI commands working
- ✅ Compile YAML → oxtest
- ✅ Execute oxtest files
- ✅ HTML reports generated
- ✅ JUnit reports generated
- ✅ 90%+ test coverage
- ✅ All tests passing
- ✅ User-friendly output
- ✅ JSDoc comments complete
- ✅ Code reviewed

## Next Sprint

[Sprint 9: Integration & Polish](./sprint-9-integration.md)

---

**Last Updated**: November 13, 2025
