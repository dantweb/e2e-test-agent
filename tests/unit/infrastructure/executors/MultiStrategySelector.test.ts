import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { MultiStrategySelector } from '../../../../src/infrastructure/executors/MultiStrategySelector';
import { SelectorSpec } from '../../../../src/domain/entities/SelectorSpec';

describe('MultiStrategySelector', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let selector: MultiStrategySelector;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
    selector = new MultiStrategySelector();
  });

  afterEach(async () => {
    await page.close();
    await context.close();
  });

  describe('CSS Selector Strategy', () => {
    it('should find element by CSS selector', async () => {
      await page.setContent('<button class="submit">Click me</button>');

      const spec = new SelectorSpec('css', 'button.submit');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const text = await element.textContent();
      expect(text).toBe('Click me');
    });

    it('should find element by CSS ID selector', async () => {
      await page.setContent('<div id="content">Content here</div>');

      const spec = new SelectorSpec('css', '#content');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const text = await element.textContent();
      expect(text).toBe('Content here');
    });

    it('should find element by complex CSS selector', async () => {
      await page.setContent(`
        <div class="container">
          <form>
            <input type="text" name="username" />
          </form>
        </div>
      `);

      const spec = new SelectorSpec('css', 'div.container form input[name="username"]');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
    });
  });

  describe('XPath Selector Strategy', () => {
    it('should find element by XPath', async () => {
      await page.setContent('<button id="submit">Click</button>');

      const spec = new SelectorSpec('xpath', '//button[@id="submit"]');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const text = await element.textContent();
      expect(text).toBe('Click');
    });

    it('should find element by XPath with text condition', async () => {
      await page.setContent(`
        <div>
          <button>Cancel</button>
          <button>Submit</button>
        </div>
      `);

      const spec = new SelectorSpec('xpath', '//button[text()="Submit"]');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const text = await element.textContent();
      expect(text).toBe('Submit');
    });
  });

  describe('Text Selector Strategy', () => {
    it('should find element by exact text', async () => {
      await page.setContent('<button>Submit Form</button>');

      const spec = new SelectorSpec('text', 'Submit Form');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
    });

    it('should find element by partial text', async () => {
      await page.setContent('<button>Submit the Form</button>');

      const spec = new SelectorSpec('text', 'Submit');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
    });
  });

  describe('Placeholder Selector Strategy', () => {
    it('should find element by placeholder', async () => {
      await page.setContent('<input placeholder="Enter email">');

      const spec = new SelectorSpec('placeholder', 'Enter email');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const placeholder = await element.getAttribute('placeholder');
      expect(placeholder).toBe('Enter email');
    });

    it('should find element by partial placeholder', async () => {
      await page.setContent('<input placeholder="Enter your email address">');

      const spec = new SelectorSpec('placeholder', 'Enter your email');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
    });
  });

  describe('Role Selector Strategy', () => {
    it('should find element by role', async () => {
      await page.setContent('<button>Submit</button>');

      const spec = new SelectorSpec('role', 'button');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
    });

    it('should find link by role', async () => {
      await page.setContent('<a href="/home">Home</a>');

      const spec = new SelectorSpec('role', 'link');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
    });

    it('should find heading by role', async () => {
      await page.setContent('<h1>Welcome</h1>');

      const spec = new SelectorSpec('role', 'heading');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
    });
  });

  describe('Test ID Selector Strategy', () => {
    it('should find element by test ID', async () => {
      await page.setContent('<button data-testid="submit-btn">Submit</button>');

      const spec = new SelectorSpec('testid', 'submit-btn');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const text = await element.textContent();
      expect(text).toBe('Submit');
    });

    it('should find input by test ID', async () => {
      await page.setContent('<input data-testid="username-input" type="text">');

      const spec = new SelectorSpec('testid', 'username-input');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
    });
  });

  describe('Fallback Strategy', () => {
    it('should use fallback when primary strategy fails', async () => {
      await page.setContent('<button class="btn">Submit</button>');

      const spec = new SelectorSpec('text', 'Nonexistent', [
        { strategy: 'css', value: 'button.btn' },
      ]);
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const text = await element.textContent();
      expect(text).toBe('Submit');
    });

    it('should try multiple fallbacks in order', async () => {
      await page.setContent('<button id="submit-button">Submit</button>');

      const spec = new SelectorSpec('css', 'button.nonexistent', [
        { strategy: 'text', value: 'Nonexistent' },
        { strategy: 'css', value: '#submit-button' },
      ]);
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const text = await element.textContent();
      expect(text).toBe('Submit');
    });

    it('should work with primary strategy if it succeeds', async () => {
      await page.setContent('<button class="primary">Submit</button>');

      const spec = new SelectorSpec('css', 'button.primary', [
        { strategy: 'css', value: 'button.secondary' },
      ]);
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const text = await element.textContent();
      expect(text).toBe('Submit');
    });

    it('should throw error when all strategies fail', async () => {
      await page.setContent('<div>No button here</div>');

      const spec = new SelectorSpec('css', 'button.nonexistent', [
        { strategy: 'text', value: 'Also nonexistent' },
        { strategy: 'css', value: '#another-nonexistent' },
      ]);

      await expect(selector.locate(page, spec)).rejects.toThrow('Element not found');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported strategy', async () => {
      await page.setContent('<button>Test</button>');

      // Force an invalid strategy by creating a mock object with invalid strategy
      // We'll create the selector first, then modify its internal property
      // Since the constructor validates, we'll test with a valid edge case instead
      // Testing that getLocator handles truly invalid cases
      const invalidSelector = Object.create(SelectorSpec.prototype);
      Object.assign(invalidSelector, {
        strategy: 'invalid' as any,
        value: 'test',
        fallbacks: [],
      });

      await expect(selector.locate(page, invalidSelector)).rejects.toThrow(
        'Unsupported selector strategy'
      );
    });

    it('should throw meaningful error when element not found', async () => {
      await page.setContent('<div>Empty</div>');

      const spec = new SelectorSpec('css', 'button.missing');

      await expect(selector.locate(page, spec)).rejects.toThrow(
        'Element not found with selector: css=button.missing'
      );
    });
  });

  describe('Timeout Handling', () => {
    it('should wait for element to appear within timeout', async () => {
      await page.setContent('<div id="container"></div>');

      // Add element after delay
      setTimeout(async () => {
        await page.evaluate(() => {
          const container = document.getElementById('container');
          if (container) {
            const button = document.createElement('button');
            button.className = 'delayed';
            button.textContent = 'Delayed Button';
            container.appendChild(button);
          }
        });
      }, 500);

      const spec = new SelectorSpec('css', 'button.delayed');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const text = await element.textContent();
      expect(text).toBe('Delayed Button');
    });

    it('should timeout if element does not appear', async () => {
      await page.setContent('<div>No button</div>');

      const spec = new SelectorSpec('css', 'button.never-appears');

      await expect(selector.locate(page, spec)).rejects.toThrow();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle nested elements', async () => {
      await page.setContent(`
        <div class="outer">
          <div class="inner">
            <button class="nested">Click</button>
          </div>
        </div>
      `);

      const spec = new SelectorSpec('css', 'div.outer div.inner button.nested');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
    });

    it('should handle multiple elements and return first', async () => {
      await page.setContent(`
        <button class="action">First</button>
        <button class="action">Second</button>
      `);

      const spec = new SelectorSpec('css', 'button.action');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const text = await element.textContent();
      expect(text).toBe('First');
    });

    it('should handle special characters in selectors', async () => {
      await page.setContent('<div data-test="value:with:colons">Content</div>');

      const spec = new SelectorSpec('css', '[data-test="value:with:colons"]');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
    });

    it('should work with dynamically added content', async () => {
      await page.setContent('<div id="root"></div>');

      await page.evaluate(() => {
        const root = document.getElementById('root');
        if (root) {
          root.innerHTML = '<button id="dynamic">Dynamic</button>';
        }
      });

      const spec = new SelectorSpec('css', '#dynamic');
      const element = await selector.locate(page, spec);

      expect(element).toBeDefined();
      const text = await element.textContent();
      expect(text).toBe('Dynamic');
    });
  });
});
