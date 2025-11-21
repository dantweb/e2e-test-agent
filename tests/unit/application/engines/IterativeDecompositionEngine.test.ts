import { IterativeDecompositionEngine } from '../../../../src/application/engines/IterativeDecompositionEngine';
import { ILLMProvider } from '../../../../src/infrastructure/llm/interfaces';
import { HTMLExtractor } from '../../../../src/application/engines/HTMLExtractor';
import { OxtestParser } from '../../../../src/infrastructure/parsers/OxtestParser';
import { OxtestCommand } from '../../../../src/domain/entities/OxtestCommand';
import { SelectorSpec } from '../../../../src/domain/entities/SelectorSpec';

describe('IterativeDecompositionEngine', () => {
  let engine: IterativeDecompositionEngine;
  let mockLLM: jest.Mocked<ILLMProvider>;
  let mockExtractor: jest.Mocked<HTMLExtractor>;
  let mockParser: jest.Mocked<OxtestParser>;

  beforeEach(() => {
    mockLLM = {
      generate: jest.fn(),
    } as any;

    mockExtractor = {
      extractSimplified: jest.fn(),
      extractHTML: jest.fn(),
      extractVisible: jest.fn(),
      extractInteractive: jest.fn(),
      extractSemantic: jest.fn(),
      extractTruncated: jest.fn(),
    } as any;

    mockParser = {
      parseContent: jest.fn(),
      parseFile: jest.fn(),
    } as any;

    engine = new IterativeDecompositionEngine(mockLLM, mockExtractor, mockParser, 'gpt-4o');
  });

  describe('Two-Pass Decomposition', () => {
    it('should decompose single step instruction', async () => {
      const instruction = 'Navigate to homepage';

      mockExtractor.extractSimplified.mockResolvedValue('<html><body></body></html>');

      // Pass 1: Planning - returns single step
      mockLLM.generate.mockResolvedValueOnce({
        content: '1. Navigate to homepage',
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      // Pass 2: Command generation
      mockLLM.generate.mockResolvedValueOnce({
        content: 'navigate url=https://shop.dev',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent.mockReturnValue([
        new OxtestCommand('navigate', { url: 'https://shop.dev' }),
      ]);

      const subtask = await engine.decompose(instruction);

      expect(subtask.commands).toHaveLength(1);
      expect(subtask.commands[0].type).toBe('navigate');
      expect(subtask.description).toBe(instruction);
      expect(mockLLM.generate).toHaveBeenCalledTimes(2); // Planning + command generation
    });

    it('should use simplified HTML extraction', async () => {
      const instruction = 'Click submit button';

      mockExtractor.extractSimplified.mockResolvedValue('<button>Submit</button>');

      // Pass 1: Planning
      mockLLM.generate.mockResolvedValueOnce({
        content: '1. Click submit button',
        usage: { promptTokens: 100, completionTokens: 10, totalTokens: 110 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      // Pass 2: Command generation
      mockLLM.generate.mockResolvedValueOnce({
        content: 'click text="Submit"',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent.mockReturnValue([
        new OxtestCommand('click', {}, new SelectorSpec('text', 'Submit')),
      ]);

      await engine.decompose(instruction);

      expect(mockExtractor.extractSimplified).toHaveBeenCalled();
      expect(mockExtractor.extractSimplified).toHaveBeenCalledTimes(3); // Once for planning, once for command gen, once for validation
    });

    it('should pass system prompt to LLM', async () => {
      const instruction = 'Test';

      mockExtractor.extractSimplified.mockResolvedValue('<html></html>');

      // Pass 1: Planning
      mockLLM.generate.mockResolvedValueOnce({
        content: '1. Navigate to test site',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      // Pass 2: Command generation
      mockLLM.generate.mockResolvedValueOnce({
        content: 'navigate url=https://test.com',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent.mockReturnValue([
        new OxtestCommand('navigate', { url: 'https://test.com' }),
      ]);

      await engine.decompose(instruction);

      // Both planning and command generation should receive system prompts
      expect(mockLLM.generate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          systemPrompt: expect.any(String),
        })
      );
    });

    it('should generate multiple commands for multi-step instruction', async () => {
      const instruction = 'Login with username and password';

      mockExtractor.extractSimplified.mockResolvedValue(
        '<form><input name="username"/><input name="password"/><button>Login</button></form>'
      );

      // Pass 1: Planning - returns 3 steps
      mockLLM.generate.mockResolvedValueOnce({
        content: '1. Fill username field\n2. Fill password field\n3. Click login button',
        usage: { promptTokens: 100, completionTokens: 30, totalTokens: 130 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      // Pass 2: Command generation for step 1
      mockLLM.generate.mockResolvedValueOnce({
        content: 'type css=[name="username"] value="admin"',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      // Pass 2: Command generation for step 2
      mockLLM.generate.mockResolvedValueOnce({
        content: 'type css=[name="password"] value="secret"',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      // Pass 2: Command generation for step 3
      mockLLM.generate.mockResolvedValueOnce({
        content: 'click text="Login"',
        usage: { promptTokens: 50, completionTokens: 5, totalTokens: 55 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent
        .mockReturnValueOnce([
          new OxtestCommand(
            'type',
            { value: 'admin' },
            new SelectorSpec('css', '[name="username"]')
          ),
        ])
        .mockReturnValueOnce([
          new OxtestCommand(
            'type',
            { value: 'secret' },
            new SelectorSpec('css', '[name="password"]')
          ),
        ])
        .mockReturnValueOnce([new OxtestCommand('click', {}, new SelectorSpec('text', 'Login'))]);

      const subtask = await engine.decompose(instruction);

      expect(subtask.commands).toHaveLength(3);
      expect(subtask.commands[0].type).toBe('type');
      expect(subtask.commands[1].type).toBe('type');
      expect(subtask.commands[2].type).toBe('click');
      expect(mockLLM.generate).toHaveBeenCalledTimes(4); // 1 planning + 3 command generation
    });
  });

  describe('Iterative Decomposition', () => {
    it('should perform iterative refinement', async () => {
      const instruction = 'Login with username admin and password secret';

      mockExtractor.extractSimplified
        .mockResolvedValueOnce('<form><input name="username"/></form>')
        .mockResolvedValueOnce('<form><input name="password"/></form>')
        .mockResolvedValueOnce('<form><button>Login</button></form>');

      mockLLM.generate
        .mockResolvedValueOnce({
          content: 'type css=input[name="username"] value=admin',
          usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
          model: 'gpt-4',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: 'type css=input[name="password"] value=secret',
          usage: { promptTokens: 150, completionTokens: 25, totalTokens: 175 },
          model: 'gpt-4',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: 'click text="Login"',
          usage: { promptTokens: 120, completionTokens: 15, totalTokens: 135 },
          model: 'gpt-4',
          finishReason: 'stop',
        });

      mockParser.parseContent
        .mockReturnValueOnce([
          new OxtestCommand(
            'fill',
            { value: 'admin' },
            new SelectorSpec('css', 'input[name="username"]')
          ),
        ])
        .mockReturnValueOnce([
          new OxtestCommand(
            'fill',
            { value: 'secret' },
            new SelectorSpec('css', 'input[name="password"]')
          ),
        ])
        .mockReturnValueOnce([new OxtestCommand('click', {}, new SelectorSpec('text', 'Login'))]);

      const subtask = await engine.decomposeIteratively(instruction, 3);

      expect(subtask.commands).toHaveLength(3);
      expect(subtask.commands[0].params.value).toBe('admin');
      expect(subtask.commands[1].params.value).toBe('secret');
      expect(subtask.commands[2].type).toBe('click');
    });

    it('should stop on completion signal', async () => {
      mockExtractor.extractSimplified.mockResolvedValue('<html></html>');
      mockLLM.generate.mockResolvedValue({
        content: 'COMPLETE',
        usage: { promptTokens: 50, completionTokens: 5, totalTokens: 55 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent.mockReturnValue([]);

      const subtask = await engine.decomposeIteratively('Do task', 5);

      // Should have a no-op command since completion was signaled
      expect(subtask.commands.length).toBeGreaterThan(0);
      expect(mockLLM.generate).toHaveBeenCalledTimes(1);
    });

    it('should respect max iterations', async () => {
      mockExtractor.extractSimplified.mockResolvedValue('<html></html>');
      mockLLM.generate.mockResolvedValue({
        content: 'wait timeout=1000',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent.mockReturnValue([new OxtestCommand('wait', { timeout: 1000 })]);

      const subtask = await engine.decomposeIteratively('Test', 2);

      expect(mockLLM.generate).toHaveBeenCalledTimes(2);
      expect(subtask.commands).toHaveLength(2);
    });

    it('should maintain conversation history', async () => {
      mockExtractor.extractSimplified.mockResolvedValue('<html></html>');

      mockLLM.generate
        .mockResolvedValueOnce({
          content: 'navigate url=https://test.com',
          usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
          model: 'gpt-4',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: 'COMPLETE',
          usage: { promptTokens: 150, completionTokens: 5, totalTokens: 155 },
          model: 'gpt-4',
          finishReason: 'stop',
        });

      mockParser.parseContent
        .mockReturnValueOnce([new OxtestCommand('navigate', { url: 'https://test.com' })])
        .mockReturnValueOnce([]);

      await engine.decomposeIteratively('Test', 5);

      // Second call should include conversation history
      expect(mockLLM.generate).toHaveBeenCalledTimes(2);
      const secondCall = mockLLM.generate.mock.calls[1];
      expect(secondCall[1]).toHaveProperty('conversationHistory');
    });
  });

  describe('Completion Detection', () => {
    it('should detect "COMPLETE" signal', async () => {
      mockExtractor.extractSimplified.mockResolvedValue('<html></html>');
      mockLLM.generate.mockResolvedValue({
        content: 'COMPLETE',
        usage: { promptTokens: 50, completionTokens: 5, totalTokens: 55 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent.mockReturnValue([]);

      const subtask = await engine.decomposeIteratively('Test', 10);

      // Should have a no-op command since completion was signaled
      expect(subtask.commands.length).toBeGreaterThan(0);
      expect(mockLLM.generate).toHaveBeenCalledTimes(1);
    });

    it('should detect "complete" (lowercase)', async () => {
      mockExtractor.extractSimplified.mockResolvedValue('<html></html>');
      mockLLM.generate.mockResolvedValue({
        content: 'complete',
        usage: { promptTokens: 50, completionTokens: 5, totalTokens: 55 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent.mockReturnValue([]);

      const subtask = await engine.decomposeIteratively('Test', 10);

      // Should have a no-op command since completion was signaled
      expect(subtask.commands.length).toBeGreaterThan(0);
    });

    it('should detect "DONE" signal', async () => {
      mockExtractor.extractSimplified.mockResolvedValue('<html></html>');
      mockLLM.generate.mockResolvedValue({
        content: 'DONE',
        usage: { promptTokens: 50, completionTokens: 5, totalTokens: 55 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent.mockReturnValue([]);

      const subtask = await engine.decomposeIteratively('Test', 10);

      // Should have a no-op command since completion was signaled
      expect(subtask.commands.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTML extraction errors', async () => {
      mockExtractor.extractSimplified.mockRejectedValue(new Error('Page error'));

      await expect(engine.decompose('Test')).rejects.toThrow('Decomposition failed');
    });

    it('should handle LLM errors in planning phase', async () => {
      mockExtractor.extractSimplified.mockResolvedValue('<html></html>');
      mockLLM.generate.mockRejectedValue(new Error('LLM error'));

      await expect(engine.decompose('Test')).rejects.toThrow('Decomposition failed');
    });

    it('should handle LLM errors in command generation phase', async () => {
      mockExtractor.extractSimplified.mockResolvedValue('<html></html>');

      // Planning succeeds
      mockLLM.generate.mockResolvedValueOnce({
        content: '1. Do something',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      // Command generation fails
      mockLLM.generate.mockRejectedValueOnce(new Error('LLM error'));

      await expect(engine.decompose('Test')).rejects.toThrow('Decomposition failed');
    });

    it('should handle parser errors gracefully with fallback', async () => {
      mockExtractor.extractSimplified.mockResolvedValue('<html></html>');

      // Planning succeeds
      mockLLM.generate.mockResolvedValueOnce({
        content: '1. Do something',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      // Command generation returns invalid content
      mockLLM.generate.mockResolvedValueOnce({
        content: 'invalid command',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent.mockImplementation(() => {
        throw new Error('Parse error');
      });

      // Should not throw, but return fallback wait command
      const subtask = await engine.decompose('Test');
      expect(subtask.commands).toHaveLength(1);
      expect(subtask.commands[0].type).toBe('wait');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty plan from LLM', async () => {
      mockExtractor.extractSimplified.mockResolvedValue('<html></html>');

      // Planning returns empty/invalid response (no parseable steps)
      mockLLM.generate.mockResolvedValueOnce({
        content: 'I cannot do this task',
        usage: { promptTokens: 50, completionTokens: 5, totalTokens: 55 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      // Command generation for fallback step (original instruction)
      mockLLM.generate.mockResolvedValueOnce({
        content: 'wait timeout=0',
        usage: { promptTokens: 30, completionTokens: 5, totalTokens: 35 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent.mockReturnValue([new OxtestCommand('wait', { timeout: 0 })]);

      const subtask = await engine.decompose('Test instruction');

      expect(subtask).toBeDefined();
      expect(subtask.description).toBe('Test instruction');
      // Should have a wait command from fallback
      expect(subtask.commands.length).toBeGreaterThan(0);
    });

    it('should handle zero max iterations', async () => {
      const subtask = await engine.decomposeIteratively('Test', 0);

      // Should have a no-op command since no iterations were run
      expect(subtask.commands.length).toBeGreaterThan(0);
      expect(mockLLM.generate).not.toHaveBeenCalled();
    });

    it('should handle empty HTML', async () => {
      mockExtractor.extractSimplified.mockResolvedValue('');

      // Planning with empty HTML
      mockLLM.generate.mockResolvedValueOnce({
        content: '1. Navigate to test site',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      // Command generation
      mockLLM.generate.mockResolvedValueOnce({
        content: 'navigate url=https://test.com',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        model: 'gpt-4',
        finishReason: 'stop',
      });

      mockParser.parseContent.mockReturnValue([
        new OxtestCommand('navigate', { url: 'https://test.com' }),
      ]);

      const subtask = await engine.decompose('Navigate');

      expect(subtask.commands).toHaveLength(1);
    });
  });
});
