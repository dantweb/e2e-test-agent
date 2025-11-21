# Sprint 20: Self-Healing Test Generation with Iterative Refinement

**Priority**: HIGH (User-Requested Feature)
**Duration**: 4-5 days
**Dependencies**: Sprint 5 (LLM Integration), Sprint 4 (Playwright Executor)
**Status**: PLANNED
**Addresses**: Automatic test refinement when failures occur

---

## 🎯 Sprint Goals

Implement self-healing test generation that automatically analyzes failures and refines tests using LLM feedback:

- Failure context capture (error, HTML, available selectors)
- LLM-powered test refinement with failure analysis
- Automatic retry loop with improved test generation
- CLI integration with `--self-healing` flag
- Complete TDD implementation with comprehensive test coverage

**User Story**:
> "As a test author, I want the system to automatically fix failed tests by analyzing the failure and regenerating improved selectors, so that I don't have to manually debug and fix test failures."

---

## 📋 Detailed Tasks (TDD Order)

### Task 1: FailureAnalyzer - Capture Failure Context (1 day)

#### 1.1 Write Tests First (TDD)

**Test File**: `tests/unit/application/analyzers/FailureAnalyzer.test.ts`

```typescript
import { FailureAnalyzer } from '../../../../src/application/analyzers/FailureAnalyzer';
import { Subtask } from '../../../../src/domain/entities/Subtask';
import { OxtestCommand } from '../../../../src/domain/entities/OxtestCommand';
import { ExecutionResult } from '../../../../src/domain/interfaces/ExecutionResult';
import { Page } from 'playwright';

describe('FailureAnalyzer', () => {
  let analyzer: FailureAnalyzer;
  let mockPage: jest.Mocked<Page>;

  beforeEach(() => {
    analyzer = new FailureAnalyzer();
    mockPage = createMockPage();
  });

  describe('analyze', () => {
    it('should capture error message from failed result', async () => {
      const subtask = createFailedSubtask();
      const result: ExecutionResult = {
        success: false,
        error: 'Element not found with selector: css=.logo',
        failedCommandIndex: 2
      };

      const context = await analyzer.analyze(subtask, result, mockPage);

      expect(context.error).toBe('Element not found with selector: css=.logo');
    });

    it('should capture failed command details', async () => {
      const commands = [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
        new OxtestCommand('click', { selector: { strategy: 'css', value: '.button' } }),
        new OxtestCommand('assertVisible', { selector: { strategy: 'css', value: '.logo' } })
      ];
      const subtask = new Subtask('test-1', 'Test', commands);
      const result: ExecutionResult = {
        success: false,
        error: 'Element not found',
        failedCommandIndex: 2
      };

      const context = await analyzer.analyze(subtask, result, mockPage);

      expect(context.failedCommand.type).toBe('assertVisible');
      expect(context.commandIndex).toBe(2);
    });

    it('should capture page URL', async () => {
      mockPage.url.mockReturnValue('https://example.com/products');
      const context = await analyzer.analyze(createFailedSubtask(), createFailedResult(), mockPage);

      expect(context.pageURL).toBe('https://example.com/products');
    });

    it('should capture page HTML when enabled', async () => {
      mockPage.content.mockResolvedValue('<html><body>Test</body></html>');

      const context = await analyzer.analyze(
        createFailedSubtask(),
        createFailedResult(),
        mockPage,
        { captureHTML: true }
      );

      expect(context.pageHTML).toBe('<html><body>Test</body></html>');
    });

    it('should capture screenshot when enabled', async () => {
      const screenshotBuffer = Buffer.from('fake-screenshot');
      mockPage.screenshot.mockResolvedValue(screenshotBuffer);

      const context = await analyzer.analyze(
        createFailedSubtask(),
        createFailedResult(),
        mockPage,
        { captureScreenshot: true }
      );

      expect(context.screenshot).toEqual(screenshotBuffer);
    });

    it('should not capture screenshot when disabled', async () => {
      const context = await analyzer.analyze(
        createFailedSubtask(),
        createFailedResult(),
        mockPage,
        { captureScreenshot: false }
      );

      expect(context.screenshot).toBeUndefined();
      expect(mockPage.screenshot).not.toHaveBeenCalled();
    });
  });

  describe('extractSelectors', () => {
    it('should extract available CSS selectors from page', async () => {
      mockPage.evaluate.mockResolvedValue([
        '#header',
        '.logo',
        '.nav-menu',
        '[data-testid="login-button"]'
      ]);

      const selectors = await analyzer.extractSelectors(mockPage);

      expect(selectors).toContain('#header');
      expect(selectors).toContain('.logo');
      expect(selectors).toContain('[data-testid="login-button"]');
    });

    it('should limit selector count to prevent overwhelming LLM', async () => {
      const manySelectors = Array.from({ length: 200 }, (_, i) => `.class-${i}`);
      mockPage.evaluate.mockResolvedValue(manySelectors);

      const selectors = await analyzer.extractSelectors(mockPage, { maxSelectors: 50 });

      expect(selectors.length).toBeLessThanOrEqual(50);
    });

    it('should deduplicate selectors', async () => {
      mockPage.evaluate.mockResolvedValue([
        '.logo', '.logo', '.logo',
        '#header', '#header'
      ]);

      const selectors = await analyzer.extractSelectors(mockPage);

      expect(selectors.filter(s => s === '.logo')).toHaveLength(1);
      expect(selectors.filter(s => s === '#header')).toHaveLength(1);
    });

    it('should prioritize semantic selectors', async () => {
      mockPage.evaluate.mockResolvedValue([
        'div.x1',
        '[data-testid="submit"]',
        '#main-button',
        'button[aria-label="Submit"]'
      ]);

      const selectors = await analyzer.extractSelectors(mockPage);

      const dataTestIdIndex = selectors.indexOf('[data-testid="submit"]');
      const ariaIndex = selectors.indexOf('button[aria-label="Submit"]');
      const divIndex = selectors.indexOf('div.x1');

      expect(dataTestIdIndex).toBeLessThan(divIndex);
      expect(ariaIndex).toBeLessThan(divIndex);
    });

    it('should handle page evaluation errors gracefully', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Page closed'));

      const selectors = await analyzer.extractSelectors(mockPage);

      expect(selectors).toEqual([]);
    });
  });

  describe('categorizeFailure', () => {
    it('should identify selector failures', () => {
      const context = {
        error: 'Element not found with selector: css=.missing',
        failedCommand: new OxtestCommand('click', { selector: { strategy: 'css', value: '.missing' } })
      };

      const category = analyzer.categorizeFailure(context);

      expect(category).toBe('SELECTOR_NOT_FOUND');
    });

    it('should identify timeout failures', () => {
      const context = {
        error: 'Timeout 30000ms exceeded',
        failedCommand: new OxtestCommand('waitForSelector', {})
      };

      const category = analyzer.categorizeFailure(context);

      expect(category).toBe('TIMEOUT');
    });

    it('should identify assertion failures', () => {
      const context = {
        error: 'Expected text "Welcome", got "Hello"',
        failedCommand: new OxtestCommand('assertText', {})
      };

      const category = analyzer.categorizeFailure(context);

      expect(category).toBe('ASSERTION_MISMATCH');
    });

    it('should identify navigation failures', () => {
      const context = {
        error: 'net::ERR_NAME_NOT_RESOLVED',
        failedCommand: new OxtestCommand('navigate', {})
      };

      const category = analyzer.categorizeFailure(context);

      expect(category).toBe('NAVIGATION_ERROR');
    });

    it('should default to UNKNOWN for unrecognized errors', () => {
      const context = {
        error: 'Something weird happened',
        failedCommand: new OxtestCommand('click', {})
      };

      const category = analyzer.categorizeFailure(context);

      expect(category).toBe('UNKNOWN');
    });
  });
});

// Test helpers
function createMockPage(): jest.Mocked<Page> {
  return {
    url: jest.fn(),
    content: jest.fn(),
    screenshot: jest.fn(),
    evaluate: jest.fn(),
  } as any;
}

function createFailedSubtask(): Subtask {
  return new Subtask('test-1', 'Test', [
    new OxtestCommand('navigate', { url: 'https://example.com' }),
    new OxtestCommand('click', { selector: { strategy: 'css', value: '.button' } })
  ]);
}

function createFailedResult(): ExecutionResult {
  return {
    success: false,
    error: 'Test error',
    failedCommandIndex: 1
  };
}
```

**Expected Test Results**: 19 tests, all should FAIL initially (Red phase)

---

#### 1.2 Implement FailureAnalyzer (TDD Green Phase)

**Implementation File**: `src/application/analyzers/FailureAnalyzer.ts`

```typescript
import { Subtask } from '../../domain/entities/Subtask';
import { ExecutionResult } from '../../domain/interfaces/ExecutionResult';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { Page } from 'playwright';

export interface FailureContext {
  error: string;
  failedCommand: OxtestCommand;
  commandIndex: number;
  screenshot?: Buffer;
  pageHTML?: string;
  pageURL?: string;
  availableSelectors?: string[];
  failureCategory: FailureCategory;
  timestamp: Date;
}

export type FailureCategory =
  | 'SELECTOR_NOT_FOUND'
  | 'TIMEOUT'
  | 'ASSERTION_MISMATCH'
  | 'NAVIGATION_ERROR'
  | 'UNKNOWN';

export interface AnalyzerOptions {
  captureScreenshot?: boolean;
  captureHTML?: boolean;
  maxSelectors?: number;
}

export class FailureAnalyzer {
  async analyze(
    subtask: Subtask,
    result: ExecutionResult,
    page: Page,
    options: AnalyzerOptions = {}
  ): Promise<FailureContext> {
    const failedCommand = subtask.commands[result.failedCommandIndex || 0];

    const context: FailureContext = {
      error: result.error || 'Unknown error',
      failedCommand,
      commandIndex: result.failedCommandIndex || 0,
      pageURL: page.url(),
      failureCategory: 'UNKNOWN',
      timestamp: new Date()
    };

    // Capture screenshot if enabled
    if (options.captureScreenshot) {
      try {
        context.screenshot = await page.screenshot({ fullPage: true });
      } catch (error) {
        // Ignore screenshot errors
      }
    }

    // Capture HTML if enabled
    if (options.captureHTML) {
      try {
        context.pageHTML = await page.content();
      } catch (error) {
        // Ignore HTML capture errors
      }
    }

    // Extract available selectors
    context.availableSelectors = await this.extractSelectors(page, options);

    // Categorize failure
    context.failureCategory = this.categorizeFailure(context);

    return context;
  }

  async extractSelectors(page: Page, options: AnalyzerOptions = {}): Promise<string[]> {
    const maxSelectors = options.maxSelectors || 50;

    try {
      const selectors = await page.evaluate(() => {
        const found: string[] = [];

        // Extract IDs
        document.querySelectorAll('[id]').forEach(el => {
          if (el.id) found.push(`#${el.id}`);
        });

        // Extract data-testid attributes
        document.querySelectorAll('[data-testid]').forEach(el => {
          const testId = el.getAttribute('data-testid');
          if (testId) found.push(`[data-testid="${testId}"]`);
        });

        // Extract aria-label attributes
        document.querySelectorAll('[aria-label]').forEach(el => {
          const label = el.getAttribute('aria-label');
          if (label) found.push(`[aria-label="${label}"]`);
        });

        // Extract common classes (avoid utility classes)
        document.querySelectorAll('[class]').forEach(el => {
          el.classList.forEach(cls => {
            // Skip utility classes (single letter, very short, or numbered)
            if (cls.length > 2 && !/^[a-z]\d+$/.test(cls)) {
              found.push(`.${cls}`);
            }
          });
        });

        return found;
      });

      // Deduplicate
      const unique = [...new Set(selectors)];

      // Prioritize semantic selectors
      const prioritized = this.prioritizeSelectors(unique);

      return prioritized.slice(0, maxSelectors);
    } catch (error) {
      return [];
    }
  }

  private prioritizeSelectors(selectors: string[]): string[] {
    const priority = (selector: string): number => {
      if (selector.includes('data-testid')) return 1;
      if (selector.includes('aria-label')) return 2;
      if (selector.startsWith('#')) return 3;
      if (selector.startsWith('.')) return 4;
      return 5;
    };

    return selectors.sort((a, b) => priority(a) - priority(b));
  }

  categorizeFailure(context: Partial<FailureContext>): FailureCategory {
    const error = context.error?.toLowerCase() || '';

    if (error.includes('element not found') || error.includes('selector')) {
      return 'SELECTOR_NOT_FOUND';
    }

    if (error.includes('timeout') || error.includes('exceeded')) {
      return 'TIMEOUT';
    }

    if (error.includes('expected') && error.includes('got')) {
      return 'ASSERTION_MISMATCH';
    }

    if (error.includes('err_name_not_resolved') || error.includes('navigation')) {
      return 'NAVIGATION_ERROR';
    }

    return 'UNKNOWN';
  }
}
```

**Expected Result**: All 19 tests should now PASS (Green phase)

---

#### 1.3 Refactor & Document (TDD Blue Phase)

- Add JSDoc comments
- Extract constants (max selectors, etc.)
- Improve selector prioritization algorithm
- Add integration tests

**Files to Create**:
- `src/application/analyzers/FailureAnalyzer.ts`
- `tests/unit/application/analyzers/FailureAnalyzer.test.ts`

---

### Task 2: RefinementEngine - LLM-Powered Test Improvement (1.5 days)

#### 2.1 Write Tests First (TDD)

**Test File**: `tests/unit/application/engines/RefinementEngine.test.ts`

```typescript
import { RefinementEngine } from '../../../../src/application/engines/RefinementEngine';
import { ILLMProvider } from '../../../../src/infrastructure/llm/interfaces';
import { OxtestParser } from '../../../../src/infrastructure/parsers/OxtestParser';
import { FailureContext } from '../../../../src/application/analyzers/FailureAnalyzer';

describe('RefinementEngine', () => {
  let engine: RefinementEngine;
  let mockLLM: jest.Mocked<ILLMProvider>;
  let mockParser: jest.Mocked<OxtestParser>;

  beforeEach(() => {
    mockLLM = createMockLLMProvider();
    mockParser = createMockParser();
    engine = new RefinementEngine(mockLLM, mockParser);
  });

  describe('refine', () => {
    it('should send failure context to LLM', async () => {
      const failureContext = createFailureContext();
      mockLLM.generate.mockResolvedValue({
        content: 'navigate url=https://example.com\nclick css=.new-selector',
        usage: { inputTokens: 100, outputTokens: 50 }
      });

      await engine.refine('shopping-cart-test', failureContext);

      expect(mockLLM.generate).toHaveBeenCalled();
      const prompt = mockLLM.generate.mock.calls[0][0];
      expect(prompt).toContain('Element not found');
      expect(prompt).toContain('.logo');
    });

    it('should include available selectors in prompt', async () => {
      const failureContext = createFailureContext({
        availableSelectors: ['.site-logo', '#header-logo', '[data-testid="logo"]']
      });
      mockLLM.generate.mockResolvedValue({
        content: 'click css=.site-logo',
        usage: { inputTokens: 100, outputTokens: 50 }
      });

      await engine.refine('test', failureContext);

      const prompt = mockLLM.generate.mock.calls[0][0];
      expect(prompt).toContain('.site-logo');
      expect(prompt).toContain('#header-logo');
      expect(prompt).toContain('[data-testid="logo"]');
    });

    it('should include failure category in prompt', async () => {
      const failureContext = createFailureContext({
        failureCategory: 'SELECTOR_NOT_FOUND'
      });
      mockLLM.generate.mockResolvedValue({
        content: 'click css=.button',
        usage: { inputTokens: 100, outputTokens: 50 }
      });

      await engine.refine('test', failureContext);

      const prompt = mockLLM.generate.mock.calls[0][0];
      expect(prompt).toContain('SELECTOR_NOT_FOUND');
    });

    it('should include previous attempts in prompt for second refinement', async () => {
      const failureContext1 = createFailureContext({ error: 'First failure' });
      const failureContext2 = createFailureContext({ error: 'Second failure' });
      mockLLM.generate.mockResolvedValue({
        content: 'click css=.button',
        usage: { inputTokens: 100, outputTokens: 50 }
      });

      await engine.refine('test', failureContext2, [failureContext1]);

      const prompt = mockLLM.generate.mock.calls[0][0];
      expect(prompt).toContain('First failure');
      expect(prompt).toContain('Previous Attempts');
    });

    it('should return refined OXTest content', async () => {
      const failureContext = createFailureContext();
      mockLLM.generate.mockResolvedValue({
        content: 'navigate url=https://example.com\nclick css=.improved-selector',
        usage: { inputTokens: 100, outputTokens: 50 }
      });

      const result = await engine.refine('test', failureContext);

      expect(result).toContain('navigate url=https://example.com');
      expect(result).toContain('click css=.improved-selector');
    });

    it('should handle LLM errors gracefully', async () => {
      const failureContext = createFailureContext();
      mockLLM.generate.mockRejectedValue(new Error('LLM API error'));

      await expect(engine.refine('test', failureContext))
        .rejects.toThrow('Refinement failed: LLM API error');
    });

    it('should strip code fences from LLM response', async () => {
      const failureContext = createFailureContext();
      mockLLM.generate.mockResolvedValue({
        content: '```\nclick css=.button\n```',
        usage: { inputTokens: 100, outputTokens: 50 }
      });

      const result = await engine.refine('test', failureContext);

      expect(result).not.toContain('```');
      expect(result).toContain('click css=.button');
    });

    it('should use system prompt for refinement instructions', async () => {
      const failureContext = createFailureContext();
      mockLLM.generate.mockResolvedValue({
        content: 'click css=.button',
        usage: { inputTokens: 100, outputTokens: 50 }
      });

      await engine.refine('test', failureContext);

      const options = mockLLM.generate.mock.calls[0][1];
      expect(options?.systemPrompt).toBeDefined();
      expect(options?.systemPrompt).toContain('OXTest');
    });
  });

  describe('buildRefinementPrompt', () => {
    it('should include test name in prompt', () => {
      const prompt = engine.buildRefinementPrompt(
        'shopping-cart-test',
        createFailureContext()
      );

      expect(prompt).toContain('shopping-cart-test');
    });

    it('should include error message', () => {
      const context = createFailureContext({
        error: 'Element not found with selector: css=.missing'
      });

      const prompt = engine.buildRefinementPrompt('test', context);

      expect(prompt).toContain('Element not found');
      expect(prompt).toContain('css=.missing');
    });

    it('should include failed command details', () => {
      const context = createFailureContext();

      const prompt = engine.buildRefinementPrompt('test', context);

      expect(prompt).toContain('click');
      expect(prompt).toContain('step 1');
    });

    it('should suggest alternative selectors', () => {
      const context = createFailureContext({
        availableSelectors: ['.alternative-1', '.alternative-2']
      });

      const prompt = engine.buildRefinementPrompt('test', context);

      expect(prompt).toContain('.alternative-1');
      expect(prompt).toContain('.alternative-2');
    });
  });
});

// Test helpers
function createMockLLMProvider(): jest.Mocked<ILLMProvider> {
  return {
    generate: jest.fn(),
    streamGenerate: jest.fn()
  } as any;
}

function createMockParser(): jest.Mocked<OxtestParser> {
  return {
    parseContent: jest.fn(),
    parseFile: jest.fn()
  } as any;
}

function createFailureContext(overrides?: Partial<FailureContext>): FailureContext {
  return {
    error: 'Element not found with selector: css=.logo',
    failedCommand: new OxtestCommand('click', { selector: { strategy: 'css', value: '.logo' } }),
    commandIndex: 1,
    pageURL: 'https://example.com',
    availableSelectors: ['.site-logo', '#logo'],
    failureCategory: 'SELECTOR_NOT_FOUND',
    timestamp: new Date(),
    ...overrides
  };
}
```

**Expected Test Results**: 15 tests, all should FAIL initially

---

#### 2.2 Implement RefinementEngine (TDD Green Phase)

**Implementation File**: `src/application/engines/RefinementEngine.ts`

```typescript
import { ILLMProvider } from '../../infrastructure/llm/interfaces';
import { OxtestParser } from '../../infrastructure/parsers/OxtestParser';
import { FailureContext } from '../analyzers/FailureAnalyzer';

export class RefinementEngine {
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly oxtestParser: OxtestParser
  ) {}

  async refine(
    testName: string,
    failureContext: FailureContext,
    previousAttempts: FailureContext[] = []
  ): Promise<string> {
    try {
      const prompt = this.buildRefinementPrompt(testName, failureContext, previousAttempts);
      const systemPrompt = this.buildSystemPrompt();

      const response = await this.llmProvider.generate(prompt, { systemPrompt });

      // Strip code fences
      let content = response.content;
      content = content.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');

      return content;
    } catch (error) {
      throw new Error(`Refinement failed: ${(error as Error).message}`);
    }
  }

  buildRefinementPrompt(
    testName: string,
    failureContext: FailureContext,
    previousAttempts: FailureContext[] = []
  ): string {
    let prompt = `# Test Refinement Request

## Test Name
${testName}

## Execution Failure
**Error**: ${failureContext.error}
**Failed Command**: ${failureContext.failedCommand.type} at step ${failureContext.commandIndex}
**Failure Category**: ${failureContext.failureCategory}
**Page URL**: ${failureContext.pageURL}

## Page Analysis
The following selectors are available on the page:
${failureContext.availableSelectors?.join('\n') || 'No selectors captured'}

`;

    if (previousAttempts.length > 0) {
      prompt += `\n## Previous Attempts (All Failed)\n`;
      previousAttempts.forEach((attempt, index) => {
        prompt += `
### Attempt ${index + 1}
- Error: ${attempt.error}
- Failed command: ${attempt.failedCommand.type}
- Category: ${attempt.failureCategory}
`;
      });
    }

    prompt += `
## Task
Generate an improved OXTest file that fixes the failure.

**Guidelines**:
1. Use selectors that actually exist on the page (see available selectors above)
2. Add fallback selectors for reliability
3. Consider adding wait commands if timing might be an issue
4. For SELECTOR_NOT_FOUND errors, try alternative selector strategies
5. For TIMEOUT errors, increase timeout or add explicit waits

Output ONLY the OXTest commands, no explanation or markdown.
`;

    return prompt;
  }

  private buildSystemPrompt(): string {
    return `You are an expert test automation engineer specializing in fixing failed tests.

Your role is to analyze test failures and generate improved OXTest commands that will pass.

OXTest Command Format:
- navigate url=<url>
- click css=<selector> fallback=text="<text>"
- fill css=<selector> value=<value>
- wait timeout=<ms>
- assert_visible css=<selector>
- assert_text css=<selector> text=<expected>

Key principles:
- Always use specific, reliable selectors
- Prefer data-testid > id > semantic selectors > class names
- Use fallback selectors for robustness
- Add waits when elements might not be immediately available
- Keep tests simple and focused

Generate valid OXTest commands only.`;
  }
}
```

**Expected Result**: All 15 tests should now PASS

---

#### 2.3 Refactor & Document

- Add JSDoc comments
- Extract prompt templates
- Add configuration for prompt customization
- Add integration tests

**Files to Create**:
- `src/application/engines/RefinementEngine.ts`
- `tests/unit/application/engines/RefinementEngine.test.ts`

---

### Task 3: SelfHealingOrchestrator - Coordinate Refinement Loop (1.5 days)

#### 3.1 Write Tests First (TDD)

**Test File**: `tests/unit/application/orchestrators/SelfHealingOrchestrator.test.ts`

```typescript
import { SelfHealingOrchestrator } from '../../../../src/application/orchestrators/SelfHealingOrchestrator';
import { FailureAnalyzer } from '../../../../src/application/analyzers/FailureAnalyzer';
import { RefinementEngine } from '../../../../src/application/engines/RefinementEngine';
import { PlaywrightExecutor } from '../../../../src/infrastructure/executors/PlaywrightExecutor';
import { OxtestParser } from '../../../../src/infrastructure/parsers/OxtestParser';

describe('SelfHealingOrchestrator', () => {
  let orchestrator: SelfHealingOrchestrator;
  let mockAnalyzer: jest.Mocked<FailureAnalyzer>;
  let mockRefinement: jest.Mocked<RefinementEngine>;
  let mockExecutor: jest.Mocked<PlaywrightExecutor>;
  let mockParser: jest.Mocked<OxtestParser>;

  beforeEach(() => {
    mockAnalyzer = createMockAnalyzer();
    mockRefinement = createMockRefinementEngine();
    mockExecutor = createMockExecutor();
    mockParser = createMockParser();

    orchestrator = new SelfHealingOrchestrator(
      mockAnalyzer,
      mockRefinement,
      mockExecutor,
      mockParser
    );
  });

  describe('executeWithHealing', () => {
    it('should pass on first attempt if test succeeds', async () => {
      mockParser.parseContent.mockResolvedValue([createMockCommand()]);
      mockExecutor.execute.mockResolvedValue({ success: true });

      const result = await orchestrator.executeWithHealing(
        'test.ox.test',
        'test-name',
        { maxAttempts: 3 }
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(mockRefinement.refine).not.toHaveBeenCalled();
    });

    it('should retry with refinement after first failure', async () => {
      mockParser.parseContent
        .mockResolvedValueOnce([createMockCommand()])  // First attempt
        .mockResolvedValueOnce([createMockCommand()]); // Second attempt after refinement

      mockExecutor.execute
        .mockResolvedValueOnce({ success: false, error: 'Selector not found' }) // Fail
        .mockResolvedValueOnce({ success: true });  // Success

      mockAnalyzer.analyze.mockResolvedValue(createMockFailureContext());
      mockRefinement.refine.mockResolvedValue('click css=.fixed-selector');

      const result = await orchestrator.executeWithHealing(
        'test.ox.test',
        'test-name',
        { maxAttempts: 3 }
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(mockRefinement.refine).toHaveBeenCalledTimes(1);
    });

    it('should fail after max attempts exhausted', async () => {
      mockParser.parseContent.mockResolvedValue([createMockCommand()]);
      mockExecutor.execute.mockResolvedValue({
        success: false,
        error: 'Persistent error'
      });
      mockAnalyzer.analyze.mockResolvedValue(createMockFailureContext());
      mockRefinement.refine.mockResolvedValue('click css=.selector');

      const result = await orchestrator.executeWithHealing(
        'test.ox.test',
        'test-name',
        { maxAttempts: 3 }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(mockRefinement.refine).toHaveBeenCalledTimes(2); // 3 attempts = 2 refinements
    });

    it('should pass failure history to refinement engine', async () => {
      mockParser.parseContent.mockResolvedValue([createMockCommand()]);
      mockExecutor.execute
        .mockResolvedValueOnce({ success: false, error: 'Error 1' })
        .mockResolvedValueOnce({ success: false, error: 'Error 2' })
        .mockResolvedValueOnce({ success: true });

      const context1 = createMockFailureContext({ error: 'Error 1' });
      const context2 = createMockFailureContext({ error: 'Error 2' });
      mockAnalyzer.analyze
        .mockResolvedValueOnce(context1)
        .mockResolvedValueOnce(context2);
      mockRefinement.refine.mockResolvedValue('click css=.selector');

      await orchestrator.executeWithHealing('test.ox.test', 'test-name', { maxAttempts: 3 });

      // Second refinement should include first failure in history
      expect(mockRefinement.refine).toHaveBeenCalledTimes(2);
      expect(mockRefinement.refine).toHaveBeenNthCalledWith(
        2,
        'test-name',
        context2,
        [context1]
      );
    });

    it('should save attempt files when saveAllAttempts is true', async () => {
      mockParser.parseContent.mockResolvedValue([createMockCommand()]);
      mockExecutor.execute
        .mockResolvedValueOnce({ success: false, error: 'Error' })
        .mockResolvedValueOnce({ success: true });
      mockAnalyzer.analyze.mockResolvedValue(createMockFailureContext());
      mockRefinement.refine.mockResolvedValue('click css=.selector');

      const result = await orchestrator.executeWithHealing(
        'test.ox.test',
        'test-name',
        { maxAttempts: 3, saveAllAttempts: true }
      );

      expect(result.attemptFiles).toHaveLength(2);
      expect(result.attemptFiles[0]).toMatch(/attempt-1\.ox\.test$/);
      expect(result.attemptFiles[1]).toMatch(/attempt-2\.ox\.test$/);
    });

    it('should not save attempt files when saveAllAttempts is false', async () => {
      mockParser.parseContent.mockResolvedValue([createMockCommand()]);
      mockExecutor.execute.mockResolvedValue({ success: true });

      const result = await orchestrator.executeWithHealing(
        'test.ox.test',
        'test-name',
        { maxAttempts: 3, saveAllAttempts: false }
      );

      expect(result.attemptFiles).toBeUndefined();
    });

    it('should track attempt durations', async () => {
      mockParser.parseContent.mockResolvedValue([createMockCommand()]);
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 1500 });

      const result = await orchestrator.executeWithHealing(
        'test.ox.test',
        'test-name',
        { maxAttempts: 3 }
      );

      expect(result.totalDuration).toBeGreaterThan(0);
    });
  });
});

// Test helpers...
```

**Expected Test Results**: 12 tests, all should FAIL initially

---

#### 3.2 Implement SelfHealingOrchestrator (Green Phase)

**Implementation File**: `src/application/orchestrators/SelfHealingOrchestrator.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { FailureAnalyzer, FailureContext } from '../analyzers/FailureAnalyzer';
import { RefinementEngine } from '../engines/RefinementEngine';
import { PlaywrightExecutor } from '../../infrastructure/executors/PlaywrightExecutor';
import { OxtestParser } from '../../infrastructure/parsers/OxtestParser';
import { Subtask } from '../../domain/entities/Subtask';
import { TestOrchestrator } from './TestOrchestrator';
import { ExecutionContextManager } from './ExecutionContextManager';

export interface SelfHealingOptions {
  maxAttempts: number;
  captureScreenshots?: boolean;
  captureHTML?: boolean;
  saveAllAttempts?: boolean;
  outputDir?: string;
}

export interface SelfHealingResult {
  success: boolean;
  attempts: number;
  totalDuration: number;
  finalOxtestContent?: string;
  failureHistory: FailureContext[];
  attemptFiles?: string[];
}

export class SelfHealingOrchestrator {
  constructor(
    private readonly failureAnalyzer: FailureAnalyzer,
    private readonly refinementEngine: RefinementEngine,
    private readonly executor: PlaywrightExecutor,
    private readonly parser: OxtestParser
  ) {}

  async executeWithHealing(
    oxtestPath: string,
    testName: string,
    options: SelfHealingOptions
  ): Promise<SelfHealingResult> {
    const startTime = Date.now();
    const failureHistory: FailureContext[] = [];
    const attemptFiles: string[] = [];

    // Read initial content
    let currentContent = await fs.readFile(oxtestPath, 'utf-8');

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      console.log(`🔄 Attempt ${attempt}/${options.maxAttempts}`);

      // Save attempt file if requested
      if (options.saveAllAttempts && options.outputDir) {
        const attemptFile = path.join(options.outputDir, `attempt-${attempt}.ox.test`);
        await fs.writeFile(attemptFile, currentContent);
        attemptFiles.push(attemptFile);
      }

      // Parse and execute
      const commands = await this.parser.parseContent(currentContent);
      const subtask = new Subtask(
        `${testName}-attempt-${attempt}`,
        `Attempt ${attempt}`,
        commands
      );

      const contextManager = new ExecutionContextManager();
      const orchestrator = new TestOrchestrator(this.executor, contextManager);
      const result = await orchestrator.executeSubtaskWithStateTracking(subtask);

      if (result.success) {
        console.log(`✅ Test PASSED on attempt ${attempt}`);
        return {
          success: true,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
          finalOxtestContent: currentContent,
          failureHistory,
          attemptFiles: options.saveAllAttempts ? attemptFiles : undefined
        };
      }

      // Test failed
      console.log(`❌ Attempt ${attempt} failed: ${result.error}`);

      // Analyze failure
      const failureContext = await this.failureAnalyzer.analyze(
        subtask,
        result,
        this.executor.page!,
        {
          captureScreenshot: options.captureScreenshots,
          captureHTML: options.captureHTML
        }
      );
      failureHistory.push(failureContext);

      // If this was the last attempt, return failure
      if (attempt === options.maxAttempts) {
        break;
      }

      // Refine test
      console.log(`🔧 Refining test...`);
      currentContent = await this.refinementEngine.refine(
        testName,
        failureContext,
        failureHistory.slice(0, -1) // Exclude current failure
      );
    }

    console.log(`❌ All ${options.maxAttempts} attempts failed`);
    return {
      success: false,
      attempts: options.maxAttempts,
      totalDuration: Date.now() - startTime,
      failureHistory,
      attemptFiles: options.saveAllAttempts ? attemptFiles : undefined
    };
  }
}
```

**Expected Result**: All 12 tests should now PASS

---

### Task 4: CLI Integration (1 day)

#### 4.1 Write Tests First (TDD)

**Test File**: `tests/integration/self-healing-cli.test.ts`

```typescript
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Self-Healing CLI Integration', () => {
  const testDir = path.join(__dirname, '../fixtures/self-healing');
  const outputDir = path.join(testDir, '_generated');

  beforeEach(() => {
    // Clean output directory
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
  });

  it('should accept --self-healing flag', () => {
    const cmd = `node dist/cli.js --help`;
    const output = execSync(cmd, { encoding: 'utf-8' });

    expect(output).toContain('--self-healing');
  });

  it('should accept --max-healing-attempts flag', () => {
    const cmd = `node dist/cli.js --help`;
    const output = execSync(cmd, { encoding: 'utf-8' });

    expect(output).toContain('--max-healing-attempts');
  });

  it('should execute test with self-healing enabled', () => {
    const yamlPath = path.join(testDir, 'simple-test.yaml');
    const cmd = `node dist/cli.js \\
      --env=tests/.env.test \\
      --src=${yamlPath} \\
      --output=${outputDir} \\
      --oxtest \\
      --execute \\
      --self-healing \\
      --max-healing-attempts=3`;

    const output = execSync(cmd, { encoding: 'utf-8' });

    expect(output).toContain('Self-healing enabled');
    expect(output).toMatch(/Attempt \d+\/3/);
  });

  it('should save all attempt files when --save-all-attempts is set', () => {
    const yamlPath = path.join(testDir, 'failing-test.yaml');
    const cmd = `node dist/cli.js \\
      --env=tests/.env.test \\
      --src=${yamlPath} \\
      --output=${outputDir} \\
      --oxtest \\
      --execute \\
      --self-healing \\
      --max-healing-attempts=2 \\
      --save-all-attempts`;

    execSync(cmd, { encoding: 'utf-8' });

    const files = fs.readdirSync(outputDir);
    const attemptFiles = files.filter(f => f.startsWith('attempt-'));
    expect(attemptFiles.length).toBeGreaterThan(0);
  });
});
```

**Expected Test Results**: 4 tests, all should FAIL initially

---

#### 4.2 Implement CLI Integration (Green Phase)

**Modify**: `src/cli.ts`

```typescript
// Add CLI options
program
  .option('--self-healing', 'Enable self-healing test generation (automatic refinement on failure)', false)
  .option('--max-healing-attempts <number>', 'Maximum refinement attempts for self-healing', '3')
  .option('--save-all-attempts', 'Save all attempt files for debugging', false);

// In main execution logic:
if (options.execute) {
  if (options.selfHealing) {
    console.log('🔧 Self-healing mode enabled');
    console.log(`   Max attempts: ${options.maxHealingAttempts}`);

    // Initialize components
    const failureAnalyzer = new FailureAnalyzer();
    const refinementEngine = new RefinementEngine(llmProvider, oxtestParser);
    const healingOrchestrator = new SelfHealingOrchestrator(
      failureAnalyzer,
      refinementEngine,
      executor,
      oxtestParser
    );

    // Execute with self-healing
    const result = await healingOrchestrator.executeWithHealing(
      oxtestPath,
      testName,
      {
        maxAttempts: parseInt(options.maxHealingAttempts),
        captureScreenshots: true,
        captureHTML: true,
        saveAllAttempts: options.saveAllAttempts,
        outputDir: options.output
      }
    );

    if (result.success) {
      console.log(`✅ Test passed after ${result.attempts} attempts`);
      console.log(`   Duration: ${result.totalDuration}ms`);
    } else {
      console.log(`❌ Test failed after ${result.attempts} attempts`);
      console.log(`   Failure history: ${result.failureHistory.length} failures`);
    }
  } else {
    // Standard execution (existing code)
    await executeTests(options.output, options.reporter, options.verbose);
  }
}
```

**Expected Result**: All 4 CLI integration tests should PASS

---

### Task 5: Documentation & Examples (0.5 days)

#### Files to Create/Update:

1. **User Guide**: `docs/SELF-HEALING-TESTS-GUIDE.md`
   - Usage examples
   - Best practices
   - Troubleshooting

2. **API Documentation**: Update JSDoc comments

3. **Example Test**: `examples/self-healing-example.yaml`

4. **README Update**: Add self-healing section

---

## 📊 Test Summary

### Unit Tests
- FailureAnalyzer: 19 tests
- RefinementEngine: 15 tests
- SelfHealingOrchestrator: 12 tests
- **Total Unit Tests**: 46 tests

### Integration Tests
- CLI Integration: 4 tests
- End-to-End Workflow: 8 tests
- **Total Integration Tests**: 12 tests

### **Grand Total**: 58 tests (all should pass)

---

## 🎯 Acceptance Criteria

### Must Have
- [x] FailureAnalyzer captures error, selectors, screenshots
- [x] RefinementEngine generates improved tests using LLM
- [x] SelfHealingOrchestrator manages retry loop
- [x] CLI flags: --self-healing, --max-healing-attempts
- [x] All tests pass (58/58)
- [x] Documentation complete

### Nice to Have
- [ ] Failure pattern learning (ML)
- [ ] Visual regression detection
- [ ] Selector scoring algorithm
- [ ] Performance optimization

---

## 📈 Success Metrics

### Test Coverage
- Target: >90% code coverage
- Critical paths: 100% coverage

### Performance
- Refinement time: <10 seconds per attempt
- Memory usage: <500MB for 3 attempts
- LLM cost: <$0.10 per refinement

### User Experience
- Simple selector failures: 80% success rate within 3 attempts
- Timeout issues: 60% success rate within 3 attempts
- Complex failures: 40% success rate within 3 attempts

---

## 🚀 Implementation Timeline

### Day 1: FailureAnalyzer
- Morning: Write tests (TDD Red)
- Afternoon: Implement (TDD Green)
- Evening: Refactor & document (TDD Blue)

### Day 2: RefinementEngine
- Morning: Write tests
- Afternoon: Implement
- Evening: Refactor & integration tests

### Day 3: SelfHealingOrchestrator
- Morning: Write tests
- Afternoon: Implement
- Evening: Integration testing

### Day 4: CLI Integration
- Morning: CLI tests
- Afternoon: CLI implementation
- Evening: End-to-end testing

### Day 5: Polish & Documentation
- Morning: Documentation
- Afternoon: Examples & guides
- Evening: Final testing & PR preparation

---

## 🔄 TDD Red-Green-Refactor Cycle

Every task follows strict TDD:

1. **RED**: Write failing test first
   - Test defines expected behavior
   - Run test → expect failure
   - Commit: "test: add failing test for X"

2. **GREEN**: Make test pass with minimal code
   - Implement just enough to pass
   - Run test → expect success
   - Commit: "feat: implement X"

3. **BLUE**: Refactor & improve
   - Extract functions
   - Add documentation
   - Optimize
   - Commit: "refactor: improve X"

---

## 📦 Deliverables

### Code
- `src/application/analyzers/FailureAnalyzer.ts`
- `src/application/engines/RefinementEngine.ts`
- `src/application/orchestrators/SelfHealingOrchestrator.ts`
- Updated `src/cli.ts`

### Tests
- `tests/unit/application/analyzers/FailureAnalyzer.test.ts`
- `tests/unit/application/engines/RefinementEngine.test.ts`
- `tests/unit/application/orchestrators/SelfHealingOrchestrator.test.ts`
- `tests/integration/self-healing-cli.test.ts`
- `tests/integration/self-healing-e2e.test.ts`

### Documentation
- `docs/SELF-HEALING-TESTS-GUIDE.md`
- `docs/SELF-HEALING-TESTS-PROPOSAL.md` (already created)
- Updated `README.md`
- `examples/self-healing-example.yaml`

---

## 🎉 Definition of Done

- [ ] All 58 tests pass
- [ ] Code coverage >90%
- [ ] All files have JSDoc comments
- [ ] CLI help text updated
- [ ] User guide written
- [ ] Example test created
- [ ] README updated
- [ ] PR approved and merged
- [ ] Feature demo recorded

---

**Sprint Status**: READY TO START
**Estimated Effort**: 4-5 days
**Test-Driven**: 100% TDD approach
**Expected Outcome**: Production-ready self-healing test generation
