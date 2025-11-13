import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, LLMContext, LLMResponse } from './interfaces';

/**
 * Anthropic LLM Provider implementation
 * Supports Claude models including Claude 3 Opus, Sonnet, and Haiku
 */
export class AnthropicLLMProvider implements ILLMProvider {
  private readonly client: Anthropic;

  /**
   * Creates a new Anthropic provider instance
   * @param apiKey - Anthropic API key
   * @param client - Optional Anthropic client instance (for testing)
   */
  constructor(apiKey: string, client?: Anthropic) {
    this.client = client || new Anthropic({ apiKey });
  }

  /**
   * Generate a complete response from Anthropic
   * @param prompt - The prompt to send
   * @param context - Optional context configuration
   * @returns Promise resolving to the LLM response
   */
  async generate(prompt: string, context?: LLMContext): Promise<LLMResponse> {
    try {
      const messages = this.buildMessages(prompt, context);

      const response = await this.client.messages.create({
        model: context?.model || 'claude-3-opus-20240229',
        messages,
        system: context?.systemPrompt,
        temperature: context?.temperature ?? 0.7,
        max_tokens: context?.maxTokens ?? 2000,
      });

      // Extract text content from response
      const textContent = response.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as any).text)
        .join('');

      return {
        content: textContent,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens:
            response.usage.input_tokens + response.usage.output_tokens,
        },
        model: response.model,
        finishReason: (response.stop_reason as any) || 'stop',
      };
    } catch (error) {
      throw new Error(`Anthropic API error: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a streaming response from Anthropic
   * @param prompt - The prompt to send
   * @param context - Optional context configuration
   * @returns AsyncGenerator yielding chunks of text
   */
  async *streamGenerate(
    prompt: string,
    context?: LLMContext
  ): AsyncGenerator<string, void, unknown> {
    const messages = this.buildMessages(prompt, context);

    const stream = await this.client.messages.create({
      model: context?.model || 'claude-3-opus-20240229',
      messages,
      system: context?.systemPrompt,
      temperature: context?.temperature ?? 0.7,
      max_tokens: context?.maxTokens ?? 2000,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta as any;
        if (delta.type === 'text_delta' && delta.text) {
          yield delta.text;
        }
      }
    }
  }

  /**
   * Build the messages array for the API request
   * @param prompt - The user prompt
   * @param context - Optional context with conversation history
   * @returns Array of messages
   */
  private buildMessages(
    prompt: string,
    context?: LLMContext
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> =
      [];

    // Add conversation history if provided
    if (context?.conversationHistory) {
      messages.push(...context.conversationHistory);
    }

    // Add the current user prompt
    messages.push({ role: 'user', content: prompt });

    return messages;
  }
}
