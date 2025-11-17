import { FailureAnalyzer } from '../../../../src/application/analyzers/FailureAnalyzer';
import { Subtask } from '../../../../src/domain/entities/Subtask';
import { OxtestCommand } from '../../../../src/domain/entities/OxtestCommand';
import { SelectorSpec } from '../../../../src/domain/entities/SelectorSpec';
import { ExecutionResult } from '../../../../src/domain/interfaces/ExecutionResult';

describe('FailureAnalyzer', () => {
  let analyzer: FailureAnalyzer;
  let mockPage: any;

  beforeEach(() => {
    analyzer = new FailureAnalyzer();
    mockPage = createMockPage();
  });

  describe('analyze', () => {
    it('should capture error message from failed result', async () => {
      const subtask = createFailedSubtask();
      const result: ExecutionResult = {
        success: false,
        error: new Error('Element not found with selector: css=.logo')
      };

      const context = await analyzer.analyze(subtask, result, mockPage);

      expect(context.error).toBe('Element not found with selector: css=.logo');
    });

    it('should capture failed command details', async () => {
      const commands = [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
        new OxtestCommand('click', {}, new SelectorSpec('css', '.button')),
        new OxtestCommand('assertVisible', {}, new SelectorSpec('css', '.logo')),
      ];
      const subtask = new Subtask('test-1', 'Test', commands);
      const result: ExecutionResult = {
        success: false,
        error: new Error('Element not found'),
        failedCommandIndex: 2,
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

      const context = await analyzer.analyze(createFailedSubtask(), createFailedResult(), mockPage, {
        captureHTML: true,
      });

      expect(context.pageHTML).toBe('<html><body>Test</body></html>');
    });

    it('should capture screenshot when enabled', async () => {
      const screenshotBuffer = Buffer.from('fake-screenshot');
      mockPage.screenshot.mockResolvedValue(screenshotBuffer);

      const context = await analyzer.analyze(createFailedSubtask(), createFailedResult(), mockPage, {
        captureScreenshot: true,
      });

      expect(context.screenshot).toEqual(screenshotBuffer);
    });

    it('should not capture screenshot when disabled', async () => {
      const context = await analyzer.analyze(createFailedSubtask(), createFailedResult(), mockPage, {
        captureScreenshot: false,
      });

      expect(context.screenshot).toBeUndefined();
      expect(mockPage.screenshot).not.toHaveBeenCalled();
    });

    it('should handle missing failedCommandIndex', async () => {
      const subtask = createFailedSubtask();
      const result: ExecutionResult = {
        success: false,
        error: new Error('Test error'),
        // No failedCommandIndex
      };

      const context = await analyzer.analyze(subtask, result, mockPage);

      expect(context.commandIndex).toBe(0);
      expect(context.failedCommand).toBeDefined();
    });

    it('should include timestamp', async () => {
      const before = new Date();
      const context = await analyzer.analyze(createFailedSubtask(), createFailedResult(), mockPage);
      const after = new Date();

      expect(context.timestamp).toBeInstanceOf(Date);
      expect(context.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(context.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('extractSelectors', () => {
    it('should extract available CSS selectors from page', async () => {
      mockPage.evaluate.mockResolvedValue(['#header', '.logo', '.nav-menu', '[data-testid="login-button"]']);

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
      mockPage.evaluate.mockResolvedValue(['.logo', '.logo', '.logo', '#header', '#header']);

      const selectors = await analyzer.extractSelectors(mockPage);

      const uniqueSelectors = [...new Set(selectors)];
      expect(selectors).toEqual(uniqueSelectors);
    });

    it('should prioritize semantic selectors', async () => {
      mockPage.evaluate.mockResolvedValue([
        'div.x1',
        '[data-testid="submit"]',
        '#main-button',
        'button[aria-label="Submit"]',
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
        failedCommand: new OxtestCommand('click', {}, new SelectorSpec('css', '.missing')),
      };

      const category = analyzer.categorizeFailure(context);

      expect(category).toBe('SELECTOR_NOT_FOUND');
    });

    it('should identify timeout failures', () => {
      const context = {
        error: 'Timeout 30000ms exceeded',
        failedCommand: new OxtestCommand('wait', { ms: 5000 }),
      };

      const category = analyzer.categorizeFailure(context);

      expect(category).toBe('TIMEOUT');
    });

    it('should identify assertion failures', () => {
      const context = {
        error: 'Expected text "Welcome", got "Hello"',
        failedCommand: new OxtestCommand('assertText', {}),
      };

      const category = analyzer.categorizeFailure(context);

      expect(category).toBe('ASSERTION_MISMATCH');
    });

    it('should identify navigation failures', () => {
      const context = {
        error: 'net::ERR_NAME_NOT_RESOLVED',
        failedCommand: new OxtestCommand('navigate', { url: 'https://invalid-domain.test' }),
      };

      const category = analyzer.categorizeFailure(context);

      expect(category).toBe('NAVIGATION_ERROR');
    });

    it('should default to UNKNOWN for unrecognized errors', () => {
      const context = {
        error: 'Something weird happened',
        failedCommand: new OxtestCommand('click', {}, new SelectorSpec('css', '.button')),
      };

      const category = analyzer.categorizeFailure(context);

      expect(category).toBe('UNKNOWN');
    });
  });
});

// Test helpers
function createMockPage(): any {
  return {
    url: jest.fn().mockReturnValue('https://example.com'),
    content: jest.fn().mockResolvedValue('<html></html>'),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('screenshot')),
    evaluate: jest.fn().mockResolvedValue([]),
  };
}

function createFailedSubtask(): Subtask {
  return new Subtask('test-1', 'Test', [
    new OxtestCommand('navigate', { url: 'https://example.com' }),
    new OxtestCommand('click', {}, new SelectorSpec('css', '.button')),
  ]);
}

function createFailedResult(): ExecutionResult {
  return {
    success: false,
    error: new Error('Test error'),
    failedCommandIndex: 1,
  };
}
