/**
 * ModelValidator - Validates LLM model names for different providers.
 *
 * Single Responsibility Principle (SRP):
 * - Only responsible for validating model names
 * - Does not make API calls or manage configuration
 *
 * Open/Closed Principle (OCP):
 * - Closed for modification (stable validation logic)
 * - Open for extension (add new providers by extending VALID_MODELS)
 */
export class ModelValidator {
  /**
   * Registry of valid model names per provider.
   * Human-readable format for maintainability.
   */
  private static readonly VALID_MODELS: Record<string, string[]> = {
    openai: [
      // Native OpenAI models
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',

      // DeepSeek models via OpenAI-compatible API
      'deepseek-reasoner',
      'deepseek-chat',
      'deepseek-coder',
    ],

    anthropic: [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
  };

  /**
   * Validates that a model name is valid for the given provider.
   *
   * Fail-fast principle: Throws immediately on invalid configuration.
   * Human-readable errors: Provides actionable guidance.
   *
   * @param provider The LLM provider name (e.g., 'openai', 'anthropic')
   * @param model The model name to validate
   * @throws Error if provider or model is invalid, with helpful guidance
   */
  public static validate(provider: string, model: string): void {
    const validModels = this.VALID_MODELS[provider];

    if (!validModels) {
      throw new Error(this.formatUnknownProviderError(provider));
    }

    if (!validModels.includes(model)) {
      throw new Error(this.formatInvalidModelError(provider, model, validModels));
    }
  }

  /**
   * Formats error message for unknown provider.
   * Separated for testability and maintainability.
   */
  private static formatUnknownProviderError(provider: string): string {
    const validProviders = Object.keys(this.VALID_MODELS);

    return [
      `Unknown provider: ${provider}`,
      `Valid providers: ${validProviders.join(', ')}`,
      '',
      'Check your .env file:',
      '  LLM_PROVIDER=openai  (or anthropic)',
    ].join('\n');
  }

  /**
   * Formats error message for invalid model name.
   * Separated for testability and maintainability.
   */
  private static formatInvalidModelError(
    provider: string,
    model: string,
    validModels: string[]
  ): string {
    return [
      `Invalid model "${model}" for provider "${provider}".`,
      '',
      'Valid models:',
      ...validModels.map(m => `  - ${m}`),
      '',
      'Check your .env file and set OPENAI_MODEL or ANTHROPIC_MODEL to a valid value.',
      'See .env.example for more details.',
    ].join('\n');
  }
}
