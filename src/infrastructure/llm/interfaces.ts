/**
 * Context configuration for LLM requests
 */
export interface LLMContext {
  /** The model to use (e.g., 'gpt-4', 'claude-3-opus-20240229') */
  model?: string;

  /** Temperature for response randomness (0.0 - 1.0) */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** System prompt to set behavior context */
  systemPrompt?: string;

  /** Conversation history for multi-turn interactions */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Response from an LLM provider
 */
export interface LLMResponse {
  /** The generated text content */
  content: string;

  /** Token usage statistics */
  usage: {
    /** Tokens in the prompt */
    promptTokens: number;

    /** Tokens in the completion */
    completionTokens: number;

    /** Total tokens used */
    totalTokens: number;
  };

  /** The model that generated the response */
  model: string;

  /** Reason the generation finished */
  finishReason: 'stop' | 'length' | 'error';
}

/**
 * Interface for LLM provider implementations
 */
export interface ILLMProvider {
  /**
   * Generate a complete response from the LLM
   * @param prompt - The prompt to send to the LLM
   * @param context - Optional context configuration
   * @returns Promise resolving to the LLM response
   */
  generate(prompt: string, context?: LLMContext): Promise<LLMResponse>;

  /**
   * Generate a streaming response from the LLM
   * @param prompt - The prompt to send to the LLM
   * @param context - Optional context configuration
   * @returns AsyncGenerator yielding chunks of text
   */
  streamGenerate(prompt: string, context?: LLMContext): AsyncGenerator<string, void, unknown>;
}
