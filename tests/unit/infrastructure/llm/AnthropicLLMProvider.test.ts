import { AnthropicLLMProvider } from '../../../../src/infrastructure/llm/AnthropicLLMProvider';
import { LLMContext } from '../../../../src/infrastructure/llm/interfaces';

describe('AnthropicLLMProvider', () => {
  let provider: AnthropicLLMProvider;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Create a mock create function
    mockCreate = jest.fn();

    // Create a mock Anthropic client
    const mockClient = {
      messages: {
        create: mockCreate,
      },
    } as any;

    // Create provider with mock client
    provider = new AnthropicLLMProvider('fake-api-key', mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate a response with default settings', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Generated content' }],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const response = await provider.generate('Test prompt');

      expect(response.content).toBe('Generated content');
      expect(response.usage.promptTokens).toBe(100);
      expect(response.usage.completionTokens).toBe(50);
      expect(response.usage.totalTokens).toBe(150);
      expect(response.model).toBe('claude-3-opus-20240229');
      expect(response.finishReason).toBe('end_turn');
    });

    it('should use system prompt when provided', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 0, output_tokens: 0 },
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const context: LLMContext = {
        systemPrompt: 'You are a testing assistant',
      };

      await provider.generate('Test', context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a testing assistant',
        })
      );
    });

    it('should use conversation history when provided', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 0, output_tokens: 0 },
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
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
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 0, output_tokens: 0 },
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      await provider.generate('Test', { model: 'claude-3-sonnet-20240229' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-sonnet-20240229',
        })
      );
    });

    it('should use custom temperature when provided', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 0, output_tokens: 0 },
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
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
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 0, output_tokens: 0 },
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
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
      mockCreate.mockRejectedValue(
        new Error('API Error: Rate limit exceeded')
      );

      await expect(provider.generate('Test')).rejects.toThrow(
        'Anthropic API error: API Error: Rate limit exceeded'
      );
    });

    it('should handle multiple text blocks in response', async () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'First part ' },
          { type: 'text', text: 'Second part' },
        ],
        usage: { input_tokens: 10, output_tokens: 5 },
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const response = await provider.generate('Test');

      expect(response.content).toBe('First part Second part');
    });

    it('should filter non-text content blocks', async () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'Text content' },
          { type: 'image', data: 'base64data' },
          { type: 'text', text: ' More text' },
        ],
        usage: { input_tokens: 10, output_tokens: 5 },
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const response = await provider.generate('Test');

      expect(response.content).toBe('Text content More text');
    });

    it('should combine system prompt and conversation history', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 0, output_tokens: 0 },
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
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
          system: 'You are a testing assistant',
          messages: [
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
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello ' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'World' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: '!' },
          };
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
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Response' },
          };
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
          system: 'You are a testing assistant',
          stream: true,
        })
      );
    });

    it('should skip non-content events in stream', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello' },
          };
          yield { type: 'message_start' }; // Non-content event
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'World' },
          };
        },
      };

      mockCreate.mockResolvedValue(mockStream as any);

      const chunks: string[] = [];
      for await (const chunk of provider.streamGenerate('Test')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', 'World']);
    });

    it('should skip content blocks without text', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Text' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'image_delta', data: 'base64' },
          };
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
    it('should create instance with API key', () => {
      const newProvider = new AnthropicLLMProvider('test-key');
      expect(newProvider).toBeInstanceOf(AnthropicLLMProvider);
    });

    it('should accept custom client', () => {
      const customClient = {
        messages: {
          create: jest.fn(),
        },
      } as any;

      const newProvider = new AnthropicLLMProvider('test-key', customClient);
      expect(newProvider).toBeInstanceOf(AnthropicLLMProvider);
    });
  });
});
