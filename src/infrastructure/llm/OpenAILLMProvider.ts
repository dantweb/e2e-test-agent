import { OpenAI } from 'openai';
import { ILLMProvider, LLMContext, LLMResponse } from './interfaces';
import { ModelValidator } from './ModelValidator';

/**
 * OpenAI LLM Provider implementation.
 * Supports GPT models and OpenAI-compatible APIs (e.g., DeepSeek).
 *
 * Follows SOLID principles:
 * - Single Responsibility: Only handles OpenAI API communication
 * - Dependency Inversion: Implements ILLMProvider interface
 * - Fail-fast: Validates configuration at construction time
 */
export class OpenAILLMProvider implements ILLMProvider {
  private readonly client: OpenAI;
  private readonly defaultModel: string;
  private readonly defaultMaxTokens: number;
  private readonly defaultTemperature: number;

  /**
   * Creates a new OpenAI provider instance.
   *
   * @param config Configuration object
   * @param config.apiKey OpenAI API key (required)
   * @param config.apiUrl API base URL (optional, defaults to OpenAI)
   * @param config.model Default model name (required, validated)
   * @param config.maxTokens Default max tokens (optional)
   * @param config.temperature Default temperature (optional)
   * @param client Optional OpenAI client instance (for testing)
   *
   * @throws Error if model is invalid for 'openai' provider
   */
  constructor(
    config: {
      apiKey: string;
      apiUrl?: string;
      model: string;
      maxTokens?: number;
      temperature?: number;
    },
    client?: OpenAI
  ) {
    // Validate model early (fail-fast principle)
    ModelValidator.validate('openai', config.model);

    // Store validated configuration
    this.defaultModel = config.model;
    this.defaultMaxTokens = config.maxTokens ?? 4000;
    this.defaultTemperature = config.temperature ?? 0.7;

    // Initialize OpenAI client
    this.client =
      client ||
      new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiUrl,
      });
  }

  /**
   * Generate a complete response from OpenAI
   * @param prompt - The prompt to send
   * @param context - Optional context configuration
   * @returns Promise resolving to the LLM response
   */
  async generate(prompt: string, context?: LLMContext): Promise<LLMResponse> {
    try {
      const messages = this.buildMessages(prompt, context);

      const response = await this.client.chat.completions.create({
        model: context?.model || this.defaultModel,
        messages,
        temperature: context?.temperature ?? this.defaultTemperature,
        max_tokens: context?.maxTokens ?? this.defaultMaxTokens,
      });

      const choice = response.choices[0];
      if (!choice) {
        throw new Error('No response from OpenAI');
      }

      return {
        content: choice.message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        model: response.model,
        finishReason: (choice.finish_reason as any) || 'stop',
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a streaming response from OpenAI
   * @param prompt - The prompt to send
   * @param context - Optional context configuration
   * @returns AsyncGenerator yielding chunks of text
   */
  async *streamGenerate(
    prompt: string,
    context?: LLMContext
  ): AsyncGenerator<string, void, unknown> {
    const messages = this.buildMessages(prompt, context);

    const stream = await this.client.chat.completions.create({
      model: context?.model || this.defaultModel,
      messages,
      temperature: context?.temperature ?? this.defaultTemperature,
      max_tokens: context?.maxTokens ?? this.defaultMaxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * Build the messages array for the API request
   * @param prompt - The user prompt
   * @param context - Optional context with system prompt and history
   * @returns Array of messages
   */
  private buildMessages(
    prompt: string,
    context?: LLMContext
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];

    // Add system prompt if provided
    if (context?.systemPrompt) {
      messages.push({ role: 'system', content: context.systemPrompt });
    }

    // Add conversation history if provided
    if (context?.conversationHistory) {
      messages.push(...context.conversationHistory);
    }

    // Add the current user prompt
    messages.push({ role: 'user', content: prompt });

    return messages;
  }
}
