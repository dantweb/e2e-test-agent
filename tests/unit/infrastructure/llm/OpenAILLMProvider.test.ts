import { OpenAILLMProvider } from '../../../../src/infrastructure/llm/OpenAILLMProvider';
import { LLMContext } from '../../../../src/infrastructure/llm/interfaces';

describe('OpenAILLMProvider', () => {
  let provider: OpenAILLMProvider;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Create a mock create function
    mockCreate = jest.fn();

    // Create a mock OpenAI client
    const mockClient = {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    } as any;

    // Create provider with mock client (new config-based constructor)
    provider = new OpenAILLMProvider(
      {
        apiKey: 'fake-api-key',
        model: 'gpt-4o',
      },
      mockClient
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate a response with default settings', async () => {
      const mockResponse = {
        choices: [
          {
            message: { role: 'assistant', content: 'Generated content' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
        model: 'gpt-4',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const response = await provider.generate('Test prompt');

      expect(response.content).toBe('Generated content');
      expect(response.usage.promptTokens).toBe(100);
      expect(response.usage.completionTokens).toBe(50);
      expect(response.usage.totalTokens).toBe(150);
      expect(response.model).toBe('gpt-4');
      expect(response.finishReason).toBe('stop');
    });

    it('should use system prompt when provided', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: 'gpt-4',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const context: LLMContext = {
        systemPrompt: 'You are a testing assistant',
      };

      await provider.generate('Test', context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'system', content: 'You are a testing assistant' },
            { role: 'user', content: 'Test' },
          ]),
        })
      );
    });

    it('should use conversation history when provided', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: 'gpt-4',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const context: LLMContext = {
        conversationHistory: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      };

      await provider.generate('Continue', context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'Continue' },
          ]),
        })
      );
    });

    it('should use custom model when provided', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: 'gpt-3.5-turbo',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      await provider.generate('Test', { model: 'gpt-3.5-turbo' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
        })
      );
    });

    it('should use custom temperature when provided', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: 'gpt-4',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      await provider.generate('Test', { temperature: 0.5 });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
        })
      );
    });

    it('should use custom maxTokens when provided', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: 'gpt-4',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      await provider.generate('Test', { maxTokens: 1000 });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 1000,
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API Error: Rate limit exceeded'));

      await expect(provider.generate('Test')).rejects.toThrow(
        'OpenAI API error: API Error: Rate limit exceeded'
      );
    });

    it('should handle empty response choices', async () => {
      const mockResponse = {
        choices: [],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: 'gpt-4',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      await expect(provider.generate('Test')).rejects.toThrow('No response from OpenAI');
    });

    it('should combine system prompt and conversation history', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: 'gpt-4',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const context: LLMContext = {
        systemPrompt: 'You are a testing assistant',
        conversationHistory: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi!' },
        ],
      };

      await provider.generate('Continue', context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a testing assistant' },
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi!' },
            { role: 'user', content: 'Continue' },
          ],
        })
      );
    });
  });

  describe('streamGenerate', () => {
    it('should stream response chunks', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: 'Hello ' } }] };
          yield { choices: [{ delta: { content: 'World' } }] };
          yield { choices: [{ delta: { content: '!' } }] };
        },
      };

      mockCreate.mockResolvedValue(mockStream as any);

      const chunks: string[] = [];
      for await (const chunk of provider.streamGenerate('Test')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello ', 'World', '!']);
    });

    it('should use system prompt in streaming mode', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: 'Response' } }] };
        },
      };

      mockCreate.mockResolvedValue(mockStream as any);

      const context: LLMContext = {
        systemPrompt: 'You are a testing assistant',
      };

      // Consume the stream
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of provider.streamGenerate('Test', context)) {
        // Just consume
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'system', content: 'You are a testing assistant' },
          ]),
          stream: true,
        })
      );
    });

    it('should skip chunks without content', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: 'Hello' } }] };
          yield { choices: [{ delta: {} }] }; // No content
          yield { choices: [{ delta: { content: 'World' } }] };
        },
      };

      mockCreate.mockResolvedValue(mockStream as any);

      const chunks: string[] = [];
      for await (const chunk of provider.streamGenerate('Test')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', 'World']);
    });

    it('should handle empty delta in stream', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: 'Text' } }] };
          yield { choices: [{}] }; // Empty delta
        },
      };

      mockCreate.mockResolvedValue(mockStream as any);

      const chunks: string[] = [];
      for await (const chunk of provider.streamGenerate('Test')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Text']);
    });
  });

  describe('constructor', () => {
    it('should create instance with config', () => {
      const newProvider = new OpenAILLMProvider({
        apiKey: 'test-key',
        model: 'gpt-4o',
      });
      expect(newProvider).toBeInstanceOf(OpenAILLMProvider);
    });

    it('should accept custom client', () => {
      const customClient = {
        chat: {
          completions: {
            create: jest.fn(),
          },
        },
      } as any;

      const newProvider = new OpenAILLMProvider(
        {
          apiKey: 'test-key',
          model: 'gpt-4o',
        },
        customClient
      );
      expect(newProvider).toBeInstanceOf(OpenAILLMProvider);
    });
  });
});
