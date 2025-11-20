import { ModelValidator } from '../../../../src/infrastructure/llm/ModelValidator';

describe('ModelValidator', () => {
  describe('validate - OpenAI provider', () => {
    it('should accept valid OpenAI model names', () => {
      expect(() => ModelValidator.validate('openai', 'gpt-4o')).not.toThrow();
      expect(() => ModelValidator.validate('openai', 'gpt-4o-mini')).not.toThrow();
      expect(() => ModelValidator.validate('openai', 'gpt-4-turbo')).not.toThrow();
      expect(() => ModelValidator.validate('openai', 'gpt-4')).not.toThrow();
      expect(() => ModelValidator.validate('openai', 'gpt-3.5-turbo')).not.toThrow();
    });

    it('should accept valid DeepSeek model names via OpenAI-compatible API', () => {
      expect(() => ModelValidator.validate('openai', 'deepseek-reasoner')).not.toThrow();
      expect(() => ModelValidator.validate('openai', 'deepseek-chat')).not.toThrow();
      expect(() => ModelValidator.validate('openai', 'deepseek-coder')).not.toThrow();
    });

    it('should reject invalid OpenAI model names', () => {
      expect(() => ModelValidator.validate('openai', 'invalid-model')).toThrow();
      expect(() => ModelValidator.validate('openai', 'gpt-5')).toThrow();
      expect(() => ModelValidator.validate('openai', '')).toThrow();
    });

    it('should provide helpful error message with valid options', () => {
      try {
        ModelValidator.validate('openai', 'invalid-model');
        fail('Expected validation to throw');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Invalid model "invalid-model" for provider "openai"');
        expect(message).toContain('Valid models:');
        expect(message).toContain('gpt-4o');
        expect(message).toContain('deepseek-reasoner');
        expect(message).toContain('Check your .env file');
      }
    });
  });

  describe('validate - Anthropic provider', () => {
    it('should accept valid Anthropic model names', () => {
      expect(() =>
        ModelValidator.validate('anthropic', 'claude-3-5-sonnet-20241022')
      ).not.toThrow();
      expect(() => ModelValidator.validate('anthropic', 'claude-3-opus-20240229')).not.toThrow();
      expect(() => ModelValidator.validate('anthropic', 'claude-3-sonnet-20240229')).not.toThrow();
    });

    it('should reject invalid Anthropic model names', () => {
      expect(() => ModelValidator.validate('anthropic', 'claude-4')).toThrow();
      expect(() => ModelValidator.validate('anthropic', 'gpt-4o')).toThrow();
    });

    it('should provide helpful error message for Anthropic', () => {
      try {
        ModelValidator.validate('anthropic', 'invalid-model');
        fail('Expected validation to throw');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Invalid model "invalid-model" for provider "anthropic"');
        expect(message).toContain('Valid models:');
        expect(message).toContain('claude-3-5-sonnet-20241022');
      }
    });
  });

  describe('validate - Unknown provider', () => {
    it('should reject unknown providers', () => {
      expect(() => ModelValidator.validate('unknown', 'any-model')).toThrow();
    });

    it('should list valid providers in error message', () => {
      try {
        ModelValidator.validate('unknown', 'any-model');
        fail('Expected validation to throw');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Unknown provider: unknown');
        expect(message).toContain('Valid providers:');
        expect(message).toContain('openai');
        expect(message).toContain('anthropic');
      }
    });
  });

  describe('validate - Edge cases', () => {
    it('should be case-sensitive for model names', () => {
      expect(() => ModelValidator.validate('openai', 'GPT-4O')).toThrow();
      expect(() => ModelValidator.validate('openai', 'gpt-4o')).not.toThrow();
    });

    it('should handle whitespace in model names', () => {
      expect(() => ModelValidator.validate('openai', ' gpt-4o ')).toThrow();
    });

    it('should be case-sensitive for provider names', () => {
      expect(() => ModelValidator.validate('OpenAI', 'gpt-4o')).toThrow();
      expect(() => ModelValidator.validate('OPENAI', 'gpt-4o')).toThrow();
    });
  });
});
