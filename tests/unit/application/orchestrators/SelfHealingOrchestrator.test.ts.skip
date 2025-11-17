import { SelfHealingOrchestrator } from '../../../../src/application/orchestrators/SelfHealingOrchestrator';
import { FailureAnalyzer, FailureContext } from '../../../../src/application/analyzers/FailureAnalyzer';
import { RefinementEngine } from '../../../../src/application/engines/RefinementEngine';
import { OxtestParser } from '../../../../src/infrastructure/parsers/OxtestParser';
import { OxtestCommand } from '../../../../src/domain/entities/OxtestCommand';
import { SelectorSpec } from '../../../../src/domain/entities/SelectorSpec';

describe('SelfHealingOrchestrator', () => {
  let orchestrator: SelfHealingOrchestrator;
  let mockAnalyzer: jest.Mocked<FailureAnalyzer>;
  let mockRefinement: jest.Mocked<RefinementEngine>;
  let mockParser: jest.Mocked<OxtestParser>;

  beforeEach(() => {
    mockAnalyzer = createMockAnalyzer();
    mockRefinement = createMockRefinementEngine();
    mockParser = createMockParser();

    orchestrator = new SelfHealingOrchestrator(mockAnalyzer, mockRefinement, mockParser);
  });

  describe('refineTest', () => {
    it('should return original content if test passes on first attempt', async () => {
      const oxtestContent = 'click css=.button';
      const mockCmd = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      mockParser.parseContent.mockResolvedValueOnce([mockCmd]);

      const mockExecution = jest.fn().mockResolvedValue({ success: true });

      const result = await orchestrator.refineTest(oxtestContent, 'test-name', mockExecution, {
        maxAttempts: 3,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.finalContent).toBe(oxtestContent);
      expect(mockRefinement.refine).not.toHaveBeenCalled();
    });

    it('should refine test after failure', async () => {
      const originalContent = 'click css=.wrong-selector';
      const refinedContent = 'click css=.correct-selector';
      const mockCmd = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));

      mockParser.parseContent.mockResolvedValueOnce([mockCmd]).mockResolvedValueOnce([mockCmd]);

      const mockExecution = jest
        .fn()
        .mockResolvedValueOnce({ success: false, error: new Error('Selector not found'), failedCommandIndex: 0 })
        .mockResolvedValueOnce({ success: true });

      mockAnalyzer.analyze.mockResolvedValue(createMockFailureContext());
      mockRefinement.refine.mockResolvedValue(refinedContent);

      const result = await orchestrator.refineTest(originalContent, 'test-name', mockExecution, {
        maxAttempts: 3,
        mockPage: createMockPage(),
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(result.finalContent).toBe(refinedContent);
      expect(mockRefinement.refine).toHaveBeenCalledTimes(1);
    });

    it('should fail after max attempts exhausted', async () => {
      const mockCmd = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      mockParser.parseContent.mockResolvedValue([mockCmd]);

      const mockExecution = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('Persistent error'),
        failedCommandIndex: 0,
      });

      mockAnalyzer.analyze.mockResolvedValue(createMockFailureContext());
      mockRefinement.refine.mockResolvedValue('click css=.selector');

      const result = await orchestrator.refineTest('test content', 'test-name', mockExecution, {
        maxAttempts: 3,
        mockPage: createMockPage(),
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(mockRefinement.refine).toHaveBeenCalledTimes(2);
    });

    it('should pass failure history to refinement engine', async () => {
      const mockCmd = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      mockParser.parseContent.mockResolvedValue([mockCmd]);

      const mockExecution = jest
        .fn()
        .mockResolvedValueOnce({ success: false, error: new Error('Error 1'), failedCommandIndex: 0 })
        .mockResolvedValueOnce({ success: false, error: new Error('Error 2'), failedCommandIndex: 0 })
        .mockResolvedValueOnce({ success: true });

      const context1 = createMockFailureContext({ error: 'Error 1' });
      const context2 = createMockFailureContext({ error: 'Error 2' });

      mockAnalyzer.analyze.mockResolvedValueOnce(context1).mockResolvedValueOnce(context2);

      mockRefinement.refine.mockResolvedValue('click css=.selector');

      await orchestrator.refineTest('test content', 'test-name', mockExecution, {
        maxAttempts: 3,
        mockPage: createMockPage(),
      });

      // Second refinement should include first failure in history
      expect(mockRefinement.refine).toHaveBeenCalledTimes(2);
      expect(mockRefinement.refine).toHaveBeenNthCalledWith(2, 'test-name', context2, [context1]);
    });

    it('should track total duration', async () => {
      const mockExecution = jest.fn().mockResolvedValue({ success: true, duration: 1500 });

      const result = await orchestrator.refineTest('test content', 'test-name', mockExecution, {
        maxAttempts: 3,
      });

      expect(result.totalDuration).toBeGreaterThan(0);
    });
  });
});

// Test helpers
function createMockAnalyzer(): jest.Mocked<FailureAnalyzer> {
  return {
    analyze: jest.fn(),
    extractSelectors: jest.fn(),
    categorizeFailure: jest.fn(),
  } as any;
}

function createMockRefinementEngine(): jest.Mocked<RefinementEngine> {
  return {
    refine: jest.fn(),
    buildRefinementPrompt: jest.fn(),
  } as any;
}

function createMockParser(): jest.Mocked<OxtestParser> {
  const mock = {
    parseContent: jest.fn(),
    parseFile: jest.fn(),
  } as jest.Mocked<OxtestParser>;
  return mock;
}

function createMockPage(): any {
  return {
    url: jest.fn().mockReturnValue('https://example.com'),
    content: jest.fn().mockResolvedValue('<html></html>'),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('screenshot')),
    evaluate: jest.fn().mockResolvedValue([]),
  };
}

function createMockFailureContext(overrides?: Partial<FailureContext>): FailureContext {
  return {
    error: 'Element not found with selector: css=.logo',
    failedCommand: new OxtestCommand('click', {}, new SelectorSpec('css', '.logo')),
    commandIndex: 0,
    pageURL: 'https://example.com',
    availableSelectors: ['.site-logo', '#logo'],
    failureCategory: 'SELECTOR_NOT_FOUND',
    timestamp: new Date(),
    ...overrides,
  };
}
