import { RefinementEngine } from '../../../../src/application/engines/RefinementEngine';
import { ILLMProvider } from '../../../../src/infrastructure/llm/interfaces';
import { FailureContext } from '../../../../src/application/analyzers/FailureAnalyzer';
import { OxtestCommand } from '../../../../src/domain/entities/OxtestCommand';
import { SelectorSpec } from '../../../../src/domain/entities/SelectorSpec';

describe('RefinementEngine', () => {
  let engine: RefinementEngine;
  let mockLLM: jest.Mocked<ILLMProvider>;

  beforeEach(() => {
    mockLLM = createMockLLMProvider();
    engine = new RefinementEngine(mockLLM);
  });

  describe('refine', () => {
    it('should send failure context to LLM', async () => {
      const failureContext = createFailureContext();
      mockLLM.generate.mockResolvedValue({
        content: 'navigate url=https://example.com\nclick css=.new-selector',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      await engine.refine('shopping-cart-test', failureContext);

      expect(mockLLM.generate).toHaveBeenCalled();
      const prompt = mockLLM.generate.mock.calls[0][0];
      expect(prompt).toContain('Element not found');
      expect(prompt).toContain('.logo');
    });

    it('should include available selectors in prompt', async () => {
      const failureContext = createFailureContext({
        availableSelectors: ['.site-logo', '#header-logo', '[data-testid="logo"]'],
      });
      mockLLM.generate.mockResolvedValue({
        content: 'click css=.site-logo',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      await engine.refine('test', failureContext);

      const prompt = mockLLM.generate.mock.calls[0][0];
      expect(prompt).toContain('.site-logo');
      expect(prompt).toContain('#header-logo');
      expect(prompt).toContain('[data-testid="logo"]');
    });

    it('should include failure category in prompt', async () => {
      const failureContext = createFailureContext({
        failureCategory: 'SELECTOR_NOT_FOUND',
      });
      mockLLM.generate.mockResolvedValue({
        content: 'click css=.button',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        model: 'gpt-4',
        finishReason: 'stop',
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
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        model: 'gpt-4',
        finishReason: 'stop',
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
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      const result = await engine.refine('test', failureContext);

      expect(result).toContain('navigate url=https://example.com');
      expect(result).toContain('click css=.improved-selector');
    });

    it('should handle LLM errors gracefully', async () => {
      const failureContext = createFailureContext();
      mockLLM.generate.mockRejectedValue(new Error('LLM API error'));

      await expect(engine.refine('test', failureContext)).rejects.toThrow('Refinement failed: LLM API error');
    });

    it('should strip code fences from LLM response', async () => {
      const failureContext = createFailureContext();
      mockLLM.generate.mockResolvedValue({
        content: '```\nclick css=.button\n```',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      const result = await engine.refine('test', failureContext);

      expect(result).not.toContain('```');
      expect(result).toContain('click css=.button');
    });

    it('should use system prompt for refinement instructions', async () => {
      const failureContext = createFailureContext();
      mockLLM.generate.mockResolvedValue({
        content: 'click css=.button',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      await engine.refine('test', failureContext);

      const options = mockLLM.generate.mock.calls[0][1];
      expect(options?.systemPrompt).toBeDefined();
      expect(options?.systemPrompt).toContain('OXTest');
    });
  });

  describe('buildRefinementPrompt', () => {
    it('should include test name in prompt', () => {
      const prompt = engine.buildRefinementPrompt('shopping-cart-test', createFailureContext());

      expect(prompt).toContain('shopping-cart-test');
    });

    it('should include error message', () => {
      const context = createFailureContext({
        error: 'Element not found with selector: css=.missing',
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
        availableSelectors: ['.alternative-1', '.alternative-2'],
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
    streamGenerate: jest.fn(),
  } as any;
}

function createFailureContext(overrides?: Partial<FailureContext>): FailureContext {
  return {
    error: 'Element not found with selector: css=.logo',
    failedCommand: new OxtestCommand('click', {}, new SelectorSpec('css', '.logo')),
    commandIndex: 1,
    pageURL: 'https://example.com',
    availableSelectors: ['.site-logo', '#logo'],
    failureCategory: 'SELECTOR_NOT_FOUND',
    timestamp: new Date(),
    ...overrides,
  };
}
