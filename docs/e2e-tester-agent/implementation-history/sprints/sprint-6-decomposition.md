# Sprint 6: Decomposition Engine

**Duration**: 1 week (5 days)
**Status**: ⏸️ Not Started
**Dependencies**: Sprint 1 (Domain), Sprint 4 (Playwright), Sprint 5 (LLM)

## Goal

Implement iterative decomposition engine that uses LLM to discover actions step-by-step by reading HTML/DOM and generating oxtest commands.

## Tasks

### Day 1: HTML Extractor

#### Task 1: DOM/HTML Extractor ⏸️

**TDD Approach**:
```typescript
// tests/unit/application/HTMLExtractor.test.ts
describe('HTMLExtractor', () => {
  let page: Page;
  let extractor: HTMLExtractor;

  beforeEach(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
    extractor = new HTMLExtractor(page);
  });

  it('should extract full HTML', async () => {
    await page.setContent(`
      <html>
        <body>
          <h1>Welcome</h1>
          <form>
            <input name="username" />
            <button>Submit</button>
          </form>
        </body>
      </html>
    `);

    const html = await extractor.extractHTML();

    expect(html).toContain('<h1>Welcome</h1>');
    expect(html).toContain('<input name="username"');
    expect(html).toContain('<button>Submit</button>');
  });

  it('should extract simplified HTML (no scripts/styles)', async () => {
    await page.setContent(`
      <html>
        <head>
          <style>.test { color: red; }</style>
          <script>console.log('test');</script>
        </head>
        <body>
          <div>Content</div>
        </body>
      </html>
    `);

    const html = await extractor.extractSimplified();

    expect(html).toContain('<div>Content</div>');
    expect(html).not.toContain('<style>');
    expect(html).not.toContain('<script>');
  });

  it('should extract visible elements only', async () => {
    await page.setContent(`
      <div>Visible</div>
      <div style="display:none">Hidden</div>
    `);

    const html = await extractor.extractVisible();

    expect(html).toContain('Visible');
    expect(html).not.toContain('Hidden');
  });

  it('should extract with data attributes', async () => {
    await page.setContent(`
      <button data-testid="submit-btn" class="btn">Submit</button>
    `);

    const html = await extractor.extractWithTestIds();

    expect(html).toContain('data-testid="submit-btn"');
  });
});
```

**Implementation** (src/application/engines/HTMLExtractor.ts):
```typescript
import { Page } from 'playwright';

export class HTMLExtractor {
  constructor(private readonly page: Page) {}

  async extractHTML(): Promise<string> {
    return await this.page.content();
  }

  async extractSimplified(): Promise<string> {
    return await this.page.evaluate(() => {
      const clone = document.cloneNode(true) as Document;

      // Remove scripts and styles
      clone.querySelectorAll('script, style, link[rel="stylesheet"]').forEach(el => {
        el.remove();
      });

      return clone.documentElement.outerHTML;
    });
  }

  async extractVisible(): Promise<string> {
    return await this.page.evaluate(() => {
      const isVisible = (el: Element): boolean => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      };

      const clone = document.cloneNode(true) as Document;
      const elements = Array.from(clone.body.querySelectorAll('*'));

      elements.forEach(el => {
        const original = document.querySelector(`:nth-child(${Array.from(el.parentNode?.children || []).indexOf(el) + 1})`);
        if (original && !isVisible(original)) {
          el.remove();
        }
      });

      return clone.documentElement.outerHTML;
    });
  }

  async extractWithTestIds(): Promise<string> {
    return await this.page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[data-testid], [id], [name], [class]'));
      return elements
        .map(el => el.outerHTML)
        .join('\n');
    });
  }

  async extractRelevantSection(selector: string): Promise<string> {
    return await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      return element ? element.outerHTML : '';
    }, selector);
  }
}
```

**Acceptance Criteria**:
- [ ] Extract full HTML
- [ ] Extract simplified (no scripts/styles)
- [ ] Extract visible only
- [ ] Extract with test IDs
- [ ] Extract sections
- [ ] 100% test coverage

**Estimated Time**: 4 hours

---

### Day 2-3: Iterative Discovery Engine

#### Task 2: Iterative Decomposition Engine ⏸️

**TDD Approach**:
```typescript
// tests/unit/application/IterativeDecompositionEngine.test.ts
describe('IterativeDecompositionEngine', () => {
  let engine: IterativeDecompositionEngine;
  let mockLLM: jest.Mocked<ILLMProvider>;
  let mockExtractor: jest.Mocked<HTMLExtractor>;
  let mockParser: jest.Mocked<OxtestParser>;

  beforeEach(() => {
    mockLLM = {
      generate: jest.fn(),
      streamGenerate: jest.fn()
    };

    mockExtractor = {
      extractSimplified: jest.fn()
    } as any;

    mockParser = {
      parseContent: jest.fn()
    } as any;

    engine = new IterativeDecompositionEngine(
      mockLLM,
      mockExtractor,
      mockParser
    );
  });

  it('should decompose single step instruction', async () => {
    const instruction = 'Navigate to homepage';

    mockExtractor.extractSimplified.mockResolvedValue('<html><body></body></html>');
    mockLLM.generate.mockResolvedValue({
      content: 'navigate url=https://shop.dev',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: 'gpt-4',
      finishReason: 'stop'
    });

    mockParser.parseContent.mockResolvedValue([
      OxtestCommand.navigate('https://shop.dev', 1)
    ]);

    const subtask = await engine.decompose(instruction);

    expect(subtask.commands).toHaveLength(1);
    expect(subtask.commands[0].command).toBe('navigate');
  });

  it('should perform iterative refinement', async () => {
    const instruction = 'Login with username admin and password secret';

    mockExtractor.extractSimplified
      .mockResolvedValueOnce('<form><input name="username"/></form>')
      .mockResolvedValueOnce('<form><input name="password"/></form>')
      .mockResolvedValueOnce('<form><button>Login</button></form>');

    mockLLM.generate
      .mockResolvedValueOnce({
        content: 'type css=input[name="username"] value=admin',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: 'gpt-4',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        content: 'type css=input[name="password"] value=secret',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: 'gpt-4',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        content: 'click text="Login"',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: 'gpt-4',
        finishReason: 'stop'
      });

    mockParser.parseContent
      .mockResolvedValueOnce([
        OxtestCommand.type(SelectorSpec.css('input[name="username"]'), 'admin', 1)
      ])
      .mockResolvedValueOnce([
        OxtestCommand.type(SelectorSpec.css('input[name="password"]'), 'secret', 2)
      ])
      .mockResolvedValueOnce([
        OxtestCommand.click(SelectorSpec.text('Login'), 3)
      ]);

    const subtask = await engine.decomposeIteratively(instruction, 3);

    expect(subtask.commands).toHaveLength(3);
    expect(subtask.commands[0].params.value).toBe('admin');
    expect(subtask.commands[1].params.value).toBe('secret');
    expect(subtask.commands[2].command).toBe('click');
  });

  it('should stop on completion signal', async () => {
    mockExtractor.extractSimplified.mockResolvedValue('<html></html>');
    mockLLM.generate.mockResolvedValue({
      content: 'COMPLETE',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: 'gpt-4',
      finishReason: 'stop'
    });

    const subtask = await engine.decomposeIteratively('Do task', 5);

    expect(subtask.commands).toHaveLength(0);
  });

  it('should handle errors gracefully', async () => {
    mockExtractor.extractSimplified.mockRejectedValue(new Error('Page error'));

    await expect(engine.decompose('Test'))
      .rejects
      .toThrow('Decomposition failed');
  });
});
```

**Implementation** (src/application/engines/IterativeDecompositionEngine.ts):
```typescript
import { ILLMProvider } from '../../infrastructure/llm/interfaces';
import { HTMLExtractor } from './HTMLExtractor';
import { OxtestParser } from '../../infrastructure/parsers/OxtestParser';
import { OxtestPromptBuilder } from '../../infrastructure/llm/OxtestPromptBuilder';
import { Subtask } from '../../domain/entities/Subtask';
import { OxtestCommand } from '../../domain/models/OxtestCommand';

export class IterativeDecompositionEngine {
  private readonly promptBuilder: OxtestPromptBuilder;

  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly htmlExtractor: HTMLExtractor,
    private readonly oxtestParser: OxtestParser
  ) {
    this.promptBuilder = new OxtestPromptBuilder();
  }

  async decompose(instruction: string): Promise<Subtask> {
    try {
      const html = await this.htmlExtractor.extractSimplified();

      const systemPrompt = this.promptBuilder.buildSystemPrompt();
      const userPrompt = this.promptBuilder.buildDiscoveryPrompt(instruction, html);

      const response = await this.llmProvider.generate(userPrompt, { systemPrompt });

      const commands = await this.oxtestParser.parseContent(response.content);

      return Subtask.create(`subtask-${Date.now()}`, instruction, commands);
    } catch (error) {
      throw new Error(`Decomposition failed: ${(error as Error).message}`);
    }
  }

  async decomposeIteratively(
    instruction: string,
    maxIterations = 10
  ): Promise<Subtask> {
    const commands: OxtestCommand[] = [];
    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    const systemPrompt = this.promptBuilder.buildSystemPrompt();

    for (let i = 0; i < maxIterations; i++) {
      const html = await this.htmlExtractor.extractSimplified();

      const prompt = conversationHistory.length === 0
        ? this.promptBuilder.buildDiscoveryPrompt(instruction, html)
        : this.promptBuilder.buildRefinementPrompt(instruction, html, conversationHistory);

      conversationHistory.push({ role: 'user', content: prompt });

      const response = await this.llmProvider.generate(prompt, {
        systemPrompt,
        conversationHistory: conversationHistory.slice(0, -1) // Exclude current prompt
      });

      conversationHistory.push({ role: 'assistant', content: response.content });

      // Check for completion
      if (this.isComplete(response.content)) {
        break;
      }

      // Parse and add commands
      const newCommands = await this.oxtestParser.parseContent(response.content);
      commands.push(...newCommands);

      // Check if we should continue
      if (this.shouldStop(response.content, commands.length)) {
        break;
      }
    }

    return Subtask.create(`subtask-${Date.now()}`, instruction, commands);
  }

  private isComplete(content: string): boolean {
    const normalized = content.toLowerCase().trim();
    return normalized === 'complete' || normalized === 'done' || normalized.startsWith('# complete');
  }

  private shouldStop(content: string, commandCount: number): boolean {
    // Stop if no commands generated
    if (commandCount === 0 && content.toLowerCase().includes('cannot')) {
      return true;
    }

    // Stop if LLM indicates completion
    if (this.isComplete(content)) {
      return true;
    }

    return false;
  }
}
```

**Acceptance Criteria**:
- [ ] Single-step decomposition
- [ ] Iterative refinement
- [ ] Conversation history
- [ ] Completion detection
- [ ] Error handling
- [ ] 90% test coverage

**Estimated Time**: 10 hours

---

### Day 4: Task Decomposer

#### Task 3: High-Level Task Decomposer ⏸️

**TDD Approach**:
```typescript
// tests/unit/application/TaskDecomposer.test.ts
describe('TaskDecomposer', () => {
  let decomposer: TaskDecomposer;
  let mockEngine: jest.Mocked<IterativeDecompositionEngine>;

  beforeEach(() => {
    mockEngine = {
      decomposeIteratively: jest.fn()
    } as any;

    decomposer = new TaskDecomposer(mockEngine);
  });

  it('should decompose task into subtasks', async () => {
    const test: Test = {
      name: 'Login Test',
      steps: [
        { action: 'navigate', prompt: 'Go to site' },
        { action: 'type', prompt: 'Enter username' },
        { action: 'click', prompt: 'Click login' }
      ],
      validation: {
        url_contains: '/home'
      }
    };

    mockEngine.decomposeIteratively
      .mockResolvedValueOnce(
        Subtask.create('sub-1', 'Go to site', [
          OxtestCommand.navigate('https://site.com', 1)
        ])
      )
      .mockResolvedValueOnce(
        Subtask.create('sub-2', 'Enter username', [
          OxtestCommand.type(SelectorSpec.css('input[name="username"]'), 'admin', 2)
        ])
      )
      .mockResolvedValueOnce(
        Subtask.create('sub-3', 'Click login', [
          OxtestCommand.click(SelectorSpec.text('Login'), 3)
        ])
      );

    const task = await decomposer.decomposeTest(test);

    expect(task.subtasks).toHaveLength(3);
    expect(task.validations).toHaveLength(1);
  });

  it('should add validation predicates', async () => {
    const test: Test = {
      name: 'Test',
      steps: [{ action: 'navigate', prompt: 'Go' }],
      validation: {
        url_contains: '/home',
        element_exists: '.success',
        text_visible: 'Welcome'
      }
    };

    mockEngine.decomposeIteratively.mockResolvedValue(
      Subtask.create('sub-1', 'Go', [])
    );

    const task = await decomposer.decomposeTest(test);

    expect(task.validations).toHaveLength(3);
    expect(task.validations[0].type).toBe('url');
    expect(task.validations[1].type).toBe('exists');
    expect(task.validations[2].type).toBe('visible');
  });
});
```

**Implementation** (src/application/engines/TaskDecomposer.ts):
```typescript
import { Test, Validation } from '../../configuration/schema/ConfigSchema';
import { Task } from '../../domain/entities/Task';
import { ValidationPredicate } from '../../domain/interfaces';
import { IterativeDecompositionEngine } from './IterativeDecompositionEngine';
import { SelectorSpec } from '../../domain/models/SelectorSpec';

export class TaskDecomposer {
  constructor(
    private readonly decompositionEngine: IterativeDecompositionEngine
  ) {}

  async decomposeTest(test: Test): Promise<Task> {
    let task = Task.create(`task-${Date.now()}`, test.name);

    // Decompose each step
    for (const step of test.steps) {
      const subtask = await this.decompositionEngine.decomposeIteratively(
        step.prompt,
        10
      );
      task = task.addSubtask(subtask);
    }

    // Add validations
    const predicates = this.buildValidationPredicates(test.validation);
    for (const predicate of predicates) {
      task = task.addValidation(predicate);
    }

    return task;
  }

  private buildValidationPredicates(validation: Validation): ValidationPredicate[] {
    const predicates: ValidationPredicate[] = [];

    if (validation.url_contains) {
      predicates.push({
        type: 'url',
        expected: validation.url_contains,
        description: `URL contains ${validation.url_contains}`
      });
    }

    if (validation.element_exists) {
      predicates.push({
        type: 'exists',
        selector: SelectorSpec.css(validation.element_exists),
        description: `Element exists: ${validation.element_exists}`
      });
    }

    if (validation.element_not_exists) {
      predicates.push({
        type: 'not_exists',
        selector: SelectorSpec.css(validation.element_not_exists),
        description: `Element not exists: ${validation.element_not_exists}`
      });
    }

    if (validation.text_visible) {
      predicates.push({
        type: 'visible',
        expected: validation.text_visible,
        description: `Text visible: ${validation.text_visible}`
      });
    }

    if (validation.page_title) {
      predicates.push({
        type: 'text',
        expected: validation.page_title,
        description: `Page title: ${validation.page_title}`
      });
    }

    return predicates;
  }
}
```

**Acceptance Criteria**:
- [ ] Decompose tests
- [ ] Create subtasks
- [ ] Add validation predicates
- [ ] 90% test coverage

**Estimated Time**: 4 hours

---

### Day 5: Integration Tests

#### Task 4: Decomposition Integration Tests ⏸️

**TDD Approach**:
```typescript
// tests/integration/application/DecompositionFlow.test.ts
describe('Decomposition Flow Integration', () => {
  it('should decompose complete login flow', async () => {
    // This is a full integration test with real browser
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://example.com/login');

    const extractor = new HTMLExtractor(page);
    const llmProvider = new OpenAILLMProvider(process.env.OPENAI_API_KEY!);
    const parser = new OxtestParser();
    const engine = new IterativeDecompositionEngine(llmProvider, extractor, parser);

    const subtask = await engine.decomposeIteratively(
      'Login with username "admin" and password "secret123"',
      5
    );

    expect(subtask.commands.length).toBeGreaterThan(0);
    expect(subtask.commands.some(c => c.command === 'type')).toBe(true);
    expect(subtask.commands.some(c => c.command === 'click')).toBe(true);

    await browser.close();
  }, 30000); // 30 second timeout for LLM calls
});
```

**Acceptance Criteria**:
- [ ] End-to-end decomposition
- [ ] Real browser integration
- [ ] Real LLM calls (optional)
- [ ] Application layer 90%+ coverage

**Estimated Time**: 4 hours

---

## Checklist

- [ ] Task 1: HTML extractor
- [ ] Task 2: Iterative decomposition engine
- [ ] Task 3: Task decomposer
- [ ] Task 4: Integration tests

## Definition of Done

- ✅ All decomposition components implemented
- ✅ Iterative refinement working
- ✅ HTML extraction working
- ✅ 90%+ test coverage
- ✅ All tests passing
- ✅ Integration with LLM and Playwright
- ✅ JSDoc comments complete
- ✅ Code reviewed

## Next Sprint

[Sprint 7: Orchestration](./sprint-7-orchestration.md)

---

**Last Updated**: November 13, 2025
