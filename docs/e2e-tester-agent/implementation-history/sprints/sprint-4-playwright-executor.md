# Sprint 4: Playwright Executor

**Duration**: 1.5 weeks (7 days)
**Status**: ⏸️ Not Started
**Dependencies**: Sprint 1 (Domain), Sprint 3 (Parser)

## Goal

Implement browser automation executor using Playwright to execute OxtestCommand objects with multi-strategy element selection and comprehensive error handling.

## Tasks

### Day 1-2: Element Selector

#### Task 1: Multi-Strategy Selector ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/MultiStrategySelector.test.ts
import { chromium, Page } from 'playwright';

describe('MultiStrategySelector', () => {
  let page: Page;
  let selector: MultiStrategySelector;

  beforeAll(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
  });

  beforeEach(() => {
    selector = new MultiStrategySelector(page);
  });

  it('should find element by CSS selector', async () => {
    await page.setContent('<button class="submit">Click me</button>');

    const spec = SelectorSpec.css('button.submit');
    const element = await selector.findElement(spec);

    expect(element).toBeDefined();
    const text = await element.textContent();
    expect(text).toBe('Click me');
  });

  it('should find element by text', async () => {
    await page.setContent('<button>Submit Form</button>');

    const spec = SelectorSpec.text('Submit Form');
    const element = await selector.findElement(spec);

    expect(element).toBeDefined();
  });

  it('should find element by XPath', async () => {
    await page.setContent('<button id="submit">Click</button>');

    const spec = SelectorSpec.xpath('//button[@id="submit"]');
    const element = await selector.findElement(spec);

    expect(element).toBeDefined();
  });

  it('should try fallback on primary failure', async () => {
    await page.setContent('<button class="btn">Submit</button>');

    const spec = SelectorSpec.text('Nonexistent')
      .withFallback(SelectorSpec.css('button.btn'));

    const element = await selector.findElement(spec);
    expect(element).toBeDefined();
  });

  it('should throw when all strategies fail', async () => {
    await page.setContent('<div>No button here</div>');

    const spec = SelectorSpec.css('button.nonexistent')
      .withFallback(SelectorSpec.text('Also nonexistent'));

    await expect(selector.findElement(spec))
      .rejects
      .toThrow('Element not found');
  });

  it('should find by placeholder', async () => {
    await page.setContent('<input placeholder="Enter email">');

    const spec = SelectorSpec.create('placeholder', 'Enter email');
    const element = await selector.findElement(spec);

    expect(element).toBeDefined();
  });

  it('should find by label', async () => {
    await page.setContent(`
      <label for="email">Email</label>
      <input id="email" type="text">
    `);

    const spec = SelectorSpec.create('label', 'Email');
    const element = await selector.findElement(spec);

    expect(element).toBeDefined();
  });

  it('should find by role', async () => {
    await page.setContent('<button role="submit">Submit</button>');

    const spec = SelectorSpec.create('role', 'submit');
    const element = await selector.findElement(spec);

    expect(element).toBeDefined();
  });

  it('should find by test ID', async () => {
    await page.setContent('<button data-testid="submit-btn">Submit</button>');

    const spec = SelectorSpec.create('testid', 'submit-btn');
    const element = await selector.findElement(spec);

    expect(element).toBeDefined();
  });
});
```

**Implementation** (src/infrastructure/executors/MultiStrategySelector.ts):
```typescript
import { Page, Locator } from 'playwright';
import { SelectorSpec } from '../../domain/models/SelectorSpec';

export class MultiStrategySelector {
  constructor(private readonly page: Page) {}

  async findElement(spec: SelectorSpec, timeout = 5000): Promise<Locator> {
    try {
      const locator = this.buildLocator(spec);
      await locator.waitFor({ state: 'attached', timeout });
      return locator;
    } catch (error) {
      if (spec.fallback) {
        return this.findElement(spec.fallback, timeout);
      }
      throw new Error(`Element not found: ${spec.toString()}`);
    }
  }

  private buildLocator(spec: SelectorSpec): Locator {
    switch (spec.strategy) {
      case 'css':
        return this.page.locator(spec.value);

      case 'xpath':
        return this.page.locator(`xpath=${spec.value}`);

      case 'text':
        return this.page.getByText(spec.value, { exact: true });

      case 'placeholder':
        return this.page.getByPlaceholder(spec.value);

      case 'label':
        return this.page.getByLabel(spec.value);

      case 'role':
        return this.page.getByRole(spec.value as any);

      case 'testid':
        return this.page.getByTestId(spec.value);

      default:
        throw new Error(`Unknown selector strategy: ${spec.strategy}`);
    }
  }
}
```

**Acceptance Criteria**:
- [ ] All selector strategies work
- [ ] Fallback chain works
- [ ] Timeout handling
- [ ] Clear error messages
- [ ] 100% test coverage

**Estimated Time**: 8 hours

---

### Day 3-4: Command Executors

#### Task 2: Navigation & Wait Executors ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/NavigationExecutor.test.ts
describe('NavigationExecutor', () => {
  let page: Page;
  let executor: NavigationExecutor;

  beforeEach(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
    executor = new NavigationExecutor(page);
  });

  it('should navigate to URL', async () => {
    const cmd = OxtestCommand.navigate('https://example.com', 1);
    const result = await executor.execute(cmd);

    expect(result.success).toBe(true);
    expect(page.url()).toBe('https://example.com/');
  });

  it('should wait for navigation', async () => {
    await page.goto('https://example.com');

    const cmd = new OxtestCommand(1, 'wait_navigation', undefined, { timeout: '5000' });

    // Trigger navigation
    setTimeout(() => page.goto('https://example.com/page2'), 100);

    const result = await executor.execute(cmd);
    expect(result.success).toBe(true);
  });

  it('should handle navigation timeout', async () => {
    const cmd = new OxtestCommand(1, 'navigate', undefined, {
      url: 'https://unreachable-domain-12345.com',
      timeout: '1000'
    });

    const result = await executor.execute(cmd);
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
});

describe('WaitExecutor', () => {
  let page: Page;
  let executor: WaitExecutor;

  beforeEach(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
    executor = new WaitExecutor(page);
  });

  it('should wait for specified time', async () => {
    const start = Date.now();
    const cmd = new OxtestCommand(1, 'wait', undefined, { timeout: '1000' });

    await executor.execute(cmd);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(1000);
  });

  it('should wait for element', async () => {
    await page.setContent('<div id="loading">Loading...</div>');

    setTimeout(() => {
      page.evaluate(() => {
        const div = document.getElementById('loading');
        if (div) div.innerHTML = '<div class="ready">Ready</div>';
      });
    }, 500);

    const cmd = new OxtestCommand(1, 'wait_for', SelectorSpec.css('.ready'), {
      timeout: '2000'
    });

    const result = await executor.execute(cmd);
    expect(result.success).toBe(true);
  });
});
```

**Implementation** (src/infrastructure/executors/NavigationExecutor.ts):
```typescript
import { Page } from 'playwright';
import { OxtestCommand } from '../../domain/models/OxtestCommand';
import { ExecutionResult } from '../../domain/interfaces';

export class NavigationExecutor {
  constructor(private readonly page: Page) {}

  async execute(command: OxtestCommand): Promise<ExecutionResult> {
    try {
      switch (command.command) {
        case 'navigate':
          return await this.navigate(command);
        case 'wait_navigation':
          return await this.waitNavigation(command);
        default:
          throw new Error(`Unsupported command: ${command.command}`);
      }
    } catch (error) {
      return {
        success: false,
        command: command.command,
        line: command.line,
        error: (error as Error).message
      };
    }
  }

  private async navigate(command: OxtestCommand): Promise<ExecutionResult> {
    const url = command.params.url;
    const timeout = command.params.timeout ? parseInt(command.params.timeout) : 30000;

    await this.page.goto(url, { timeout });

    return {
      success: true,
      command: 'navigate',
      line: command.line,
      output: `Navigated to ${url}`
    };
  }

  private async waitNavigation(command: OxtestCommand): Promise<ExecutionResult> {
    const timeout = command.params.timeout ? parseInt(command.params.timeout) : 30000;

    await this.page.waitForLoadState('networkidle', { timeout });

    return {
      success: true,
      command: 'wait_navigation',
      line: command.line,
      output: 'Navigation complete'
    };
  }
}
```

**Acceptance Criteria**:
- [ ] Navigate to URLs
- [ ] Wait for navigation
- [ ] Wait for time
- [ ] Wait for elements
- [ ] Timeout handling
- [ ] 100% test coverage

**Estimated Time**: 6 hours

---

#### Task 3: Interaction Executors (Click, Type, Hover) ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/InteractionExecutor.test.ts
describe('InteractionExecutor', () => {
  let page: Page;
  let executor: InteractionExecutor;
  let selector: MultiStrategySelector;

  beforeEach(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
    selector = new MultiStrategySelector(page);
    executor = new InteractionExecutor(page, selector);
  });

  it('should click element', async () => {
    await page.setContent(`
      <button id="btn">Click me</button>
      <div id="result"></div>
      <script>
        document.getElementById('btn').onclick = () => {
          document.getElementById('result').textContent = 'Clicked';
        };
      </script>
    `);

    const cmd = OxtestCommand.click(SelectorSpec.css('#btn'), 1);
    const result = await executor.execute(cmd);

    expect(result.success).toBe(true);
    const text = await page.locator('#result').textContent();
    expect(text).toBe('Clicked');
  });

  it('should type into input', async () => {
    await page.setContent('<input id="username" type="text">');

    const cmd = OxtestCommand.type(
      SelectorSpec.css('#username'),
      'testuser',
      1
    );

    const result = await executor.execute(cmd);

    expect(result.success).toBe(true);
    const value = await page.locator('#username').inputValue();
    expect(value).toBe('testuser');
  });

  it('should hover over element', async () => {
    await page.setContent(`
      <div id="menu">Menu</div>
      <div id="submenu" style="display:none">Submenu</div>
      <script>
        document.getElementById('menu').onmouseenter = () => {
          document.getElementById('submenu').style.display = 'block';
        };
      </script>
    `);

    const cmd = new OxtestCommand(1, 'hover', SelectorSpec.css('#menu'), {});
    const result = await executor.execute(cmd);

    expect(result.success).toBe(true);
    const visible = await page.locator('#submenu').isVisible();
    expect(visible).toBe(true);
  });

  it('should send keypress', async () => {
    await page.setContent('<input id="input" type="text">');
    await page.focus('#input');

    const cmd = new OxtestCommand(1, 'keypress', undefined, { key: 'Enter' });
    const result = await executor.execute(cmd);

    expect(result.success).toBe(true);
  });
});
```

**Implementation** (src/infrastructure/executors/InteractionExecutor.ts):
```typescript
import { Page } from 'playwright';
import { OxtestCommand } from '../../domain/models/OxtestCommand';
import { ExecutionResult } from '../../domain/interfaces';
import { MultiStrategySelector } from './MultiStrategySelector';

export class InteractionExecutor {
  constructor(
    private readonly page: Page,
    private readonly selector: MultiStrategySelector
  ) {}

  async execute(command: OxtestCommand): Promise<ExecutionResult> {
    try {
      switch (command.command) {
        case 'click':
          return await this.click(command);
        case 'type':
          return await this.type(command);
        case 'hover':
          return await this.hover(command);
        case 'keypress':
          return await this.keypress(command);
        default:
          throw new Error(`Unsupported command: ${command.command}`);
      }
    } catch (error) {
      return {
        success: false,
        command: command.command,
        line: command.line,
        error: (error as Error).message
      };
    }
  }

  private async click(command: OxtestCommand): Promise<ExecutionResult> {
    const timeout = command.params.timeout ? parseInt(command.params.timeout) : 5000;
    const element = await this.selector.findElement(command.selector!, timeout);

    await element.click();

    return {
      success: true,
      command: 'click',
      line: command.line,
      output: `Clicked ${command.selector!.toString()}`
    };
  }

  private async type(command: OxtestCommand): Promise<ExecutionResult> {
    const timeout = command.params.timeout ? parseInt(command.params.timeout) : 5000;
    const element = await this.selector.findElement(command.selector!, timeout);
    const value = command.params.value;

    await element.fill(value);

    return {
      success: true,
      command: 'type',
      line: command.line,
      output: `Typed into ${command.selector!.toString()}`
    };
  }

  private async hover(command: OxtestCommand): Promise<ExecutionResult> {
    const timeout = command.params.timeout ? parseInt(command.params.timeout) : 5000;
    const element = await this.selector.findElement(command.selector!, timeout);

    await element.hover();

    return {
      success: true,
      command: 'hover',
      line: command.line,
      output: `Hovered over ${command.selector!.toString()}`
    };
  }

  private async keypress(command: OxtestCommand): Promise<ExecutionResult> {
    const key = command.params.key;
    await this.page.keyboard.press(key);

    return {
      success: true,
      command: 'keypress',
      line: command.line,
      output: `Pressed key: ${key}`
    };
  }
}
```

**Acceptance Criteria**:
- [ ] Click elements
- [ ] Type into inputs
- [ ] Hover over elements
- [ ] Send keypresses
- [ ] 100% test coverage

**Estimated Time**: 6 hours

---

### Day 5-6: Assertion Executors

#### Task 4: Assertion Executors ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/AssertionExecutor.test.ts
describe('AssertionExecutor', () => {
  let page: Page;
  let executor: AssertionExecutor;
  let selector: MultiStrategySelector;

  beforeEach(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
    selector = new MultiStrategySelector(page);
    executor = new AssertionExecutor(page, selector);
  });

  it('should assert element exists', async () => {
    await page.setContent('<div class="success">Success!</div>');

    const cmd = new OxtestCommand(1, 'assert_exists', SelectorSpec.css('.success'), {});
    const result = await executor.execute(cmd);

    expect(result.success).toBe(true);
  });

  it('should assert element not exists', async () => {
    await page.setContent('<div>No error here</div>');

    const cmd = new OxtestCommand(1, 'assert_not_exists', SelectorSpec.css('.error'), {});
    const result = await executor.execute(cmd);

    expect(result.success).toBe(true);
  });

  it('should fail when element does not exist', async () => {
    await page.setContent('<div>Nothing here</div>');

    const cmd = new OxtestCommand(1, 'assert_exists', SelectorSpec.css('.nonexistent'), {});
    const result = await executor.execute(cmd);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should assert element visible', async () => {
    await page.setContent('<div class="visible">Visible</div>');

    const cmd = new OxtestCommand(1, 'assert_visible', SelectorSpec.css('.visible'), {});
    const result = await executor.execute(cmd);

    expect(result.success).toBe(true);
  });

  it('should assert text content', async () => {
    await page.setContent('<div class="message">Welcome back!</div>');

    const cmd = new OxtestCommand(1, 'assert_text', SelectorSpec.css('.message'), {
      value: 'Welcome back!'
    });
    const result = await executor.execute(cmd);

    expect(result.success).toBe(true);
  });

  it('should assert URL pattern', async () => {
    await page.goto('https://shop.dev/home');

    const cmd = new OxtestCommand(1, 'assert_url', undefined, {
      pattern: '.*/home'
    });
    const result = await executor.execute(cmd);

    expect(result.success).toBe(true);
  });

  it('should assert input value', async () => {
    await page.setContent('<input id="username" value="admin">');

    const cmd = new OxtestCommand(1, 'assert_value', SelectorSpec.css('#username'), {
      value: 'admin'
    });
    const result = await executor.execute(cmd);

    expect(result.success).toBe(true);
  });
});
```

**Implementation** (src/infrastructure/executors/AssertionExecutor.ts):
```typescript
import { Page } from 'playwright';
import { OxtestCommand } from '../../domain/models/OxtestCommand';
import { ExecutionResult } from '../../domain/interfaces';
import { MultiStrategySelector } from './MultiStrategySelector';

export class AssertionExecutor {
  constructor(
    private readonly page: Page,
    private readonly selector: MultiStrategySelector
  ) {}

  async execute(command: OxtestCommand): Promise<ExecutionResult> {
    try {
      switch (command.command) {
        case 'assert_exists':
          return await this.assertExists(command);
        case 'assert_not_exists':
          return await this.assertNotExists(command);
        case 'assert_visible':
          return await this.assertVisible(command);
        case 'assert_text':
          return await this.assertText(command);
        case 'assert_value':
          return await this.assertValue(command);
        case 'assert_url':
          return await this.assertUrl(command);
        default:
          throw new Error(`Unsupported command: ${command.command}`);
      }
    } catch (error) {
      return {
        success: false,
        command: command.command,
        line: command.line,
        error: (error as Error).message
      };
    }
  }

  private async assertExists(command: OxtestCommand): Promise<ExecutionResult> {
    try {
      await this.selector.findElement(command.selector!, 5000);
      return {
        success: true,
        command: 'assert_exists',
        line: command.line,
        output: `Element exists: ${command.selector!.toString()}`
      };
    } catch {
      throw new Error(`Element not found: ${command.selector!.toString()}`);
    }
  }

  private async assertNotExists(command: OxtestCommand): Promise<ExecutionResult> {
    try {
      await this.selector.findElement(command.selector!, 1000);
      throw new Error(`Element should not exist: ${command.selector!.toString()}`);
    } catch (error) {
      if ((error as Error).message.includes('should not exist')) {
        throw error;
      }
      return {
        success: true,
        command: 'assert_not_exists',
        line: command.line,
        output: `Element does not exist: ${command.selector!.toString()}`
      };
    }
  }

  private async assertVisible(command: OxtestCommand): Promise<ExecutionResult> {
    const element = await this.selector.findElement(command.selector!);
    const visible = await element.isVisible();

    if (!visible) {
      throw new Error(`Element not visible: ${command.selector!.toString()}`);
    }

    return {
      success: true,
      command: 'assert_visible',
      line: command.line,
      output: `Element is visible: ${command.selector!.toString()}`
    };
  }

  private async assertText(command: OxtestCommand): Promise<ExecutionResult> {
    const element = await this.selector.findElement(command.selector!);
    const text = await element.textContent();
    const expected = command.params.value;

    if (text?.trim() !== expected) {
      throw new Error(`Expected text "${expected}", got "${text}"`);
    }

    return {
      success: true,
      command: 'assert_text',
      line: command.line,
      output: `Text matches: ${expected}`
    };
  }

  private async assertValue(command: OxtestCommand): Promise<ExecutionResult> {
    const element = await this.selector.findElement(command.selector!);
    const value = await element.inputValue();
    const expected = command.params.value;

    if (value !== expected) {
      throw new Error(`Expected value "${expected}", got "${value}"`);
    }

    return {
      success: true,
      command: 'assert_value',
      line: command.line,
      output: `Value matches: ${expected}`
    };
  }

  private async assertUrl(command: OxtestCommand): Promise<ExecutionResult> {
    const pattern = new RegExp(command.params.pattern);
    const url = this.page.url();

    if (!pattern.test(url)) {
      throw new Error(`URL "${url}" does not match pattern "${command.params.pattern}"`);
    }

    return {
      success: true,
      command: 'assert_url',
      line: command.line,
      output: `URL matches pattern: ${command.params.pattern}`
    };
  }
}
```

**Acceptance Criteria**:
- [ ] All assertion types work
- [ ] Clear error messages
- [ ] Element existence/visibility
- [ ] Text and value assertions
- [ ] URL pattern matching
- [ ] 100% test coverage

**Estimated Time**: 8 hours

---

### Day 7: Integration

#### Task 5: PlaywrightExecutor (Main Facade) ⏸️

**TDD Approach**:
```typescript
// tests/integration/infrastructure/PlaywrightExecutor.test.ts
describe('PlaywrightExecutor', () => {
  let executor: PlaywrightExecutor;

  beforeEach(() => {
    executor = new PlaywrightExecutor();
  });

  afterEach(async () => {
    await executor.close();
  });

  it('should execute complete test flow', async () => {
    await executor.initialize();

    const commands = [
      OxtestCommand.navigate('https://example.com', 1),
      new OxtestCommand(2, 'wait', undefined, { timeout: '1000' }),
      new OxtestCommand(3, 'assert_url', undefined, { pattern: '.*example.com' })
    ];

    for (const cmd of commands) {
      const result = await executor.execute(cmd);
      expect(result.success).toBe(true);
    }
  });

  it('should maintain context between commands', async () => {
    await executor.initialize();

    await executor.execute(OxtestCommand.navigate('https://example.com', 1));

    // URL should be maintained
    const context = executor.getContext();
    expect(context.currentUrl).toContain('example.com');
  });

  it('should handle command failure gracefully', async () => {
    await executor.initialize();

    const cmd = new OxtestCommand(1, 'assert_exists', SelectorSpec.css('.nonexistent'), {});
    const result = await executor.execute(cmd);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

**Implementation** (src/infrastructure/executors/PlaywrightExecutor.ts):
```typescript
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { OxtestCommand } from '../../domain/models/OxtestCommand';
import { ExecutionResult, ExecutionContext } from '../../domain/interfaces';
import { MultiStrategySelector } from './MultiStrategySelector';
import { NavigationExecutor } from './NavigationExecutor';
import { InteractionExecutor } from './InteractionExecutor';
import { AssertionExecutor } from './AssertionExecutor';
import { WaitExecutor } from './WaitExecutor';

export class PlaywrightExecutor {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private executors?: {
    navigation: NavigationExecutor;
    interaction: InteractionExecutor;
    assertion: AssertionExecutor;
    wait: WaitExecutor;
  };

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: false });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    const selector = new MultiStrategySelector(this.page);

    this.executors = {
      navigation: new NavigationExecutor(this.page),
      interaction: new InteractionExecutor(this.page, selector),
      assertion: new AssertionExecutor(this.page, selector),
      wait: new WaitExecutor(this.page, selector)
    };
  }

  async execute(command: OxtestCommand): Promise<ExecutionResult> {
    if (!this.executors || !this.page) {
      throw new Error('Executor not initialized');
    }

    // Route to appropriate executor
    if (['navigate', 'wait_navigation'].includes(command.command)) {
      return this.executors.navigation.execute(command);
    }
    if (['click', 'type', 'hover', 'keypress'].includes(command.command)) {
      return this.executors.interaction.execute(command);
    }
    if (command.command.startsWith('assert_')) {
      return this.executors.assertion.execute(command);
    }
    if (['wait', 'wait_for'].includes(command.command)) {
      return this.executors.wait.execute(command);
    }

    throw new Error(`Unknown command type: ${command.command}`);
  }

  getContext(): ExecutionContext {
    if (!this.page || !this.context) {
      throw new Error('Executor not initialized');
    }

    return {
      variables: {},
      cookies: [],
      sessionId: this.context.toString(),
      currentUrl: this.page.url()
    };
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
  }
}
```

**Acceptance Criteria**:
- [ ] Initialize browser
- [ ] Execute all command types
- [ ] Maintain context
- [ ] Clean shutdown
- [ ] Infrastructure layer 85%+ coverage

**Estimated Time**: 4 hours

---

## Checklist

- [ ] Task 1: Multi-strategy selector
- [ ] Task 2: Navigation & wait executors
- [ ] Task 3: Interaction executors
- [ ] Task 4: Assertion executors
- [ ] Task 5: PlaywrightExecutor facade

## Definition of Done

- ✅ All executors implemented
- ✅ All selector strategies work
- ✅ All command types execute
- ✅ 85%+ test coverage
- ✅ All tests passing
- ✅ Error handling comprehensive
- ✅ Context maintained
- ✅ JSDoc comments complete
- ✅ Code reviewed

## Next Sprint

[Sprint 5: LLM Integration](./sprint-5-llm-integration.md)

---

**Last Updated**: November 13, 2025
