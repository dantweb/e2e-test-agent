# e2e-tester-agent: Infrastructure and Execution Layers

**Version**: 1.0
**Date**: November 13, 2025

## Layer 4: Infrastructure Layer

**Responsibility**: Implement adapters to external systems (Playwright, LLM APIs, databases)

### Playwright Executor

The core execution engine that translates abstract commands into browser actions.

```typescript
interface IPlaywrightExecutor {
  execute(subtask: Subtask): Promise<ExecutionResult>;
  initialize(config: BrowserConfig): Promise<void>;
  cleanup(): Promise<void>;
}

class PlaywrightExecutor implements IPlaywrightExecutor {
  private page?: Page;
  private context?: BrowserContext;

  constructor(
    private readonly selectorStrategy: ISelectorStrategy,
    private readonly logger: ILogger
  ) {}

  async initialize(config: BrowserConfig): Promise<void> {
    const browser = await playwright.chromium.launch({
      headless: config.headless,
      timeout: config.timeout
    });

    this.context = await browser.newContext({
      viewport: config.viewport,
      userAgent: config.userAgent
    });

    this.page = await this.context.newPage();
  }

  async execute(subtask: Subtask): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const result = await this.executeAction(subtask);

      return {
        success: true,
        subtaskId: subtask.id,
        duration: Date.now() - startTime,
        data: result,
        screenshot: await this.captureScreenshot(subtask.id)
      };
    } catch (error) {
      return {
        success: false,
        subtaskId: subtask.id,
        duration: Date.now() - startTime,
        error: error as Error,
        screenshot: await this.captureScreenshot(subtask.id)
      };
    }
  }

  private async executeAction(subtask: Subtask): Promise<unknown> {
    switch (subtask.action) {
      case ActionType.Navigate:
        return this.navigate(subtask.value!);

      case ActionType.Click:
        return this.click(subtask.selector!);

      case ActionType.Type:
        return this.type(subtask.selector!, subtask.value!);

      case ActionType.Wait:
        return this.wait(subtask.selector!);

      case ActionType.Assert:
        return this.assert(subtask.selector!, subtask.value!);

      default:
        throw new Error(`Unknown action type: ${subtask.action}`);
    }
  }

  private async navigate(url: string): Promise<void> {
    await this.page!.goto(url, { waitUntil: 'networkidle' });
  }

  private async click(selector: ElementSelector): Promise<void> {
    const locator = await this.findElement(selector);
    await locator.click({ timeout: 5000 });
  }

  private async type(selector: ElementSelector, text: string): Promise<void> {
    const locator = await this.findElement(selector);
    await locator.clear();
    await locator.fill(text);
  }

  private async wait(selector: ElementSelector): Promise<void> {
    const locator = await this.findElement(selector);
    await locator.waitFor({ state: 'visible', timeout: 10000 });
  }

  private async assert(selector: ElementSelector, expected: string): Promise<boolean> {
    const locator = await this.findElement(selector);
    const text = await locator.textContent();
    return text?.includes(expected) ?? false;
  }

  private async findElement(selector: ElementSelector): Promise<Locator> {
    return this.selectorStrategy.locate(this.page!, selector);
  }
}
```

### Selector Strategy

Multiple strategies for finding elements robustly.

```typescript
interface ISelectorStrategy {
  locate(page: Page, selector: ElementSelector): Promise<Locator>;
}

class MultiStrategySelector implements ISelectorStrategy {
  async locate(page: Page, selector: ElementSelector): Promise<Locator> {
    // Try strategies in order of reliability
    if (selector.testId) {
      return page.getByTestId(selector.testId);
    }

    if (selector.role) {
      return page.getByRole(selector.role as any, {
        name: selector.text
      });
    }

    if (selector.text) {
      return page.getByText(selector.text, { exact: false });
    }

    if (selector.css) {
      return page.locator(selector.css);
    }

    if (selector.xpath) {
      return page.locator(`xpath=${selector.xpath}`);
    }

    throw new Error('No valid selector strategy found');
  }
}
```

### LLM Provider

Abstraction over different LLM APIs.

```typescript
interface ILLMProvider {
  query(systemPrompt: string, userPrompt: string): Promise<LLMResponse>;
  queryStructured<T>(systemPrompt: string, userPrompt: string, schema: JSONSchema): Promise<T>;
}

interface LLMResponse {
  readonly content: string;
  readonly model: string;
  readonly usage: TokenUsage;
}

interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

class OpenAILLMProvider implements ILLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'gpt-4',
    private readonly temperature: number = 0.1
  ) {}

  async query(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.temperature
      })
    });

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      }
    };
  }

  async queryStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: JSONSchema
  ): Promise<T> {
    const response = await this.query(
      systemPrompt + '\n\nOutput valid JSON matching the schema.',
      userPrompt
    );

    try {
      return JSON.parse(response.content) as T;
    } catch (error) {
      throw new Error(`Failed to parse LLM response as JSON: ${error}`);
    }
  }
}

class AnthropicLLMProvider implements ILLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'claude-3-5-sonnet-20241022'
  ) {}

  async query(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    // Similar implementation for Anthropic API
  }

  async queryStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: JSONSchema
  ): Promise<T> {
    // Similar implementation for Anthropic API
  }
}
```

### LLM Provider Factory

```typescript
enum LLMProviderType {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Local = 'local'
}

interface LLMConfig {
  readonly type: LLMProviderType;
  readonly apiKey?: string;
  readonly model?: string;
  readonly baseUrl?: string;
}

class LLMProviderFactory {
  static create(config: LLMConfig): ILLMProvider {
    switch (config.type) {
      case LLMProviderType.OpenAI:
        return new OpenAILLMProvider(
          config.apiKey!,
          config.model
        );

      case LLMProviderType.Anthropic:
        return new AnthropicLLMProvider(
          config.apiKey!,
          config.model
        );

      case LLMProviderType.Local:
        return new LocalLLMProvider(
          config.baseUrl!,
          config.model!
        );

      default:
        throw new Error(`Unknown LLM provider type: ${config.type}`);
    }
  }
}
```

### Database Watcher

For validation predicates that need to check database state.

```typescript
interface IDatabaseWatcher {
  watch(query: DatabaseQuery, condition: WatchCondition): Promise<boolean>;
}

interface DatabaseQuery {
  readonly table: string;
  readonly field: string;
  readonly where?: Record<string, unknown>;
}

interface WatchCondition {
  readonly type: 'not_empty' | 'equals' | 'contains' | 'greater_than';
  readonly value?: unknown;
}

class MySQLDatabaseWatcher implements IDatabaseWatcher {
  constructor(private readonly connection: MySQLConnection) {}

  async watch(query: DatabaseQuery, condition: WatchCondition): Promise<boolean> {
    const sql = this.buildQuery(query);
    const result = await this.connection.query(sql);

    return this.evaluateCondition(result, condition);
  }

  private buildQuery(query: DatabaseQuery): string {
    let sql = `SELECT ${query.field} FROM ${query.table}`;

    if (query.where) {
      const whereClause = Object.entries(query.where)
        .map(([key, value]) => `${key} = ${this.escape(value)}`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }

    return sql;
  }

  private evaluateCondition(result: unknown, condition: WatchCondition): boolean {
    switch (condition.type) {
      case 'not_empty':
        return Array.isArray(result) && result.length > 0;

      case 'equals':
        return result === condition.value;

      case 'contains':
        return String(result).includes(String(condition.value));

      case 'greater_than':
        return Number(result) > Number(condition.value);

      default:
        return false;
    }
  }
}
```

---

## Layer 5: Output/Presentation Layer

**Responsibility**: CLI interface, report generation, user interaction

### CLI Application

```typescript
interface CLICommand {
  readonly name: string;
  readonly description: string;
  execute(args: CLIArguments): Promise<void>;
}

interface CLIArguments {
  readonly src: string;
  readonly output: string;
  readonly config?: string;
  readonly verbose?: boolean;
}

class CompileCommand implements CLICommand {
  readonly name = 'e2e-test-compile';
  readonly description = 'Compile YAML test specification to task DAG';

  constructor(
    private readonly configParser: IConfigParser,
    private readonly decompositionEngine: IDecompositionEngine,
    private readonly outputWriter: IOutputWriter
  ) {}

  async execute(args: CLIArguments): Promise<void> {
    console.log(`Compiling test from ${args.src}...`);

    // 1. Parse YAML configuration
    const config = await this.configParser.parse(args.src);

    // 2. Decompose each job into task DAG
    const tasks: Task[] = [];
    for (const job of config.jobs) {
      const task = await this.decompositionEngine.decompose(job);
      tasks.push(task);
    }

    // 3. Write task DAGs to output directory
    await this.outputWriter.write(args.output, {
      config,
      tasks,
      metadata: {
        compiledAt: new Date().toISOString(),
        version: '1.0.0'
      }
    });

    console.log(`✓ Compiled ${tasks.length} tasks to ${args.output}`);
  }
}

class ExecuteCommand implements CLICommand {
  readonly name = 'test';
  readonly description = 'Execute compiled test tasks';

  constructor(
    private readonly taskLoader: ITaskLoader,
    private readonly orchestrator: IExecutionOrchestrator,
    private readonly reporter: IReporter
  ) {}

  async execute(args: CLIArguments): Promise<void> {
    console.log(`Executing tests from ${args.src}...`);

    // 1. Load compiled task DAGs
    const tasks = await this.taskLoader.load(args.src);

    // 2. Execute each task
    const reports: ExecutionReport[] = [];
    for (const task of tasks) {
      console.log(`\nExecuting: ${task.title}`);
      const report = await this.orchestrator.execute(task);
      reports.push(report);

      this.printProgress(report);
    }

    // 3. Generate reports
    await this.reporter.generate(args.output, reports);

    console.log(`\n✓ Test execution complete`);
    this.printSummary(reports);
  }

  private printProgress(report: ExecutionReport): void {
    const { completed, failed, total } = report.stats;
    console.log(`  Progress: ${completed}/${total} completed, ${failed} failed`);
  }

  private printSummary(reports: ExecutionReport[]): void {
    const total = reports.length;
    const passed = reports.filter(r => r.passed).length;
    const failed = total - passed;

    console.log(`\nSummary: ${passed} passed, ${failed} failed (${total} total)`);
  }
}
```

### Report Generator

```typescript
interface IReporter {
  generate(outputDir: string, reports: ReadonlyArray<ExecutionReport>): Promise<void>;
}

interface ExecutionReport {
  readonly taskId: string;
  readonly taskTitle: string;
  readonly passed: boolean;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly duration: number;
  readonly subtaskReports: ReadonlyArray<SubtaskReport>;
  readonly stats: ReportStats;
}

interface SubtaskReport {
  readonly id: number;
  readonly title: string;
  readonly status: TaskStatus;
  readonly duration: number;
  readonly error?: Error;
  readonly screenshot?: string;
}

interface ReportStats {
  readonly total: number;
  readonly completed: number;
  readonly failed: number;
  readonly blocked: number;
}

class HTMLReporter implements IReporter {
  async generate(
    outputDir: string,
    reports: ReadonlyArray<ExecutionReport>
  ): Promise<void> {
    const html = this.buildHTML(reports);
    const filePath = path.join(outputDir, 'report.html');

    await fs.writeFile(filePath, html, 'utf-8');
  }

  private buildHTML(reports: ReadonlyArray<ExecutionReport>): string {
    // Generate HTML report with:
    // - Summary statistics
    // - Task breakdown
    // - Screenshots on failure
    // - Execution timeline
  }
}

class JUnitReporter implements IReporter {
  async generate(
    outputDir: string,
    reports: ReadonlyArray<ExecutionReport>
  ): Promise<void> {
    const xml = this.buildXML(reports);
    const filePath = path.join(outputDir, 'junit.xml');

    await fs.writeFile(filePath, xml, 'utf-8');
  }

  private buildXML(reports: ReadonlyArray<ExecutionReport>): string {
    // Generate JUnit XML format for CI integration
  }
}
```

---

## Data Flow Summary

```
1. User runs: npm run e2e-test-compile --src=test.yaml --output=_generated

2. CLI → ConfigParser → TestConfiguration

3. DecompositionEngine → LLM Provider → Task DAG

4. OutputWriter → Saves compiled tasks to disk

5. User runs: npm run test _generated

6. CLI → TaskLoader → Load compiled tasks

7. ExecutionOrchestrator → PlaywrightExecutor → Browser actions

8. ValidationEngine → Evaluate acceptance criteria

9. Reporter → Generate HTML/JUnit reports
```

---

## Dependency Injection

All components use dependency injection for testability:

```typescript
class ApplicationContainer {
  private readonly services = new Map<string, unknown>();

  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }

  resolve<T>(key: string): T {
    const factory = this.services.get(key) as (() => T) | undefined;
    if (!factory) {
      throw new Error(`Service not registered: ${key}`);
    }
    return factory();
  }
}

// Bootstrap
const container = new ApplicationContainer();

container.register('configParser', () => new YamlConfigParser(
  container.resolve('schemaValidator'),
  container.resolve('envResolver')
));

container.register('llmProvider', () => LLMProviderFactory.create({
  type: LLMProviderType.OpenAI,
  apiKey: process.env.OPENAI_API_KEY
}));

container.register('decompositionEngine', () => new LLMDecompositionEngine(
  container.resolve('llmProvider'),
  container.resolve('decompositionValidator')
));

// ... etc
```

This infrastructure layer completes the architecture, providing all necessary adapters while maintaining clean boundaries and testability.
