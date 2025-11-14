/**
 * OpenAI LLM Provider - Real Integration Tests
 *
 * These tests make ACTUAL API calls to OpenAI.
 * They require OPENAI_API_KEY to be set in environment.
 *
 * Run with: npm run test:integration
 */

import { OpenAILLMProvider } from '../../../src/infrastructure/llm/OpenAILLMProvider';
import { LLMContext } from '../../../src/infrastructure/llm/interfaces';

describe('OpenAI LLM Integration Tests (Real API)', () => {
  let provider: OpenAILLMProvider;
  const apiKey = process.env.OPENAI_API_KEY;
  const apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';

  beforeAll(() => {
    if (!apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not set - skipping OpenAI integration tests');
    }
  });

  beforeEach(() => {
    if (!apiKey) {
      return;
    }

    // Create real provider with actual API key
    // Note: Custom baseURL would need to be passed to OpenAI client constructor
    const OpenAI = require('openai').OpenAI;
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: apiUrl,
      timeout: 30000,
    });
    provider = new OpenAILLMProvider(apiKey, client);
  });

  describe('Basic Generation', () => {
    it('should generate a real response from OpenAI', async () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      const response = await provider.generate('Say "Hello, integration test!" and nothing else.');

      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.usage.totalTokens).toBeGreaterThan(0);
      expect(response.model).toBeTruthy();
      expect(response.finishReason).toBe('stop');

      console.log('✅ OpenAI response:', response.content.substring(0, 100));
    }, 30000); // 30 second timeout

    it('should respect system prompt', async () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      const context: LLMContext = {
        systemPrompt:
          'You are a helpful assistant that always responds in JSON format with a "message" field.',
      };

      const response = await provider.generate('Say hello', context);

      expect(response.content).toBeTruthy();
      // Should contain JSON-like structure due to system prompt
      expect(response.content).toMatch(/message|hello/i);

      console.log('✅ With system prompt:', response.content.substring(0, 100));
    }, 30000);

    it('should handle different temperature settings', async () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      const context: LLMContext = {
        temperature: 0.1, // Very low temperature for deterministic output
      };

      const response = await provider.generate('Count from 1 to 3', context);

      expect(response.content).toBeTruthy();
      expect(response.content).toMatch(/1.*2.*3/);

      console.log('✅ Temperature test:', response.content);
    }, 30000);
  });

  describe('E2E Test Generation', () => {
    it('should generate test decomposition instructions', async () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      const prompt = `
You are a test automation expert. Given this high-level test:
"Go to homepage and add a product to cart"

Decompose it into specific Playwright steps. Respond with a simple list.
      `.trim();

      const response = await provider.generate(prompt);

      expect(response.content).toBeTruthy();
      // Should mention common e2e terms
      expect(response.content.toLowerCase()).toMatch(
        /navigate|goto|click|cart|product|selector|button/,
      );

      console.log('✅ Test decomposition:', response.content.substring(0, 200));
    }, 30000);

    it('should generate CSS selectors from description', async () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      const prompt = `
Given a "Add to Cart" button, suggest 3 CSS selectors that might work.
Respond with just the selectors, one per line.
      `.trim();

      const response = await provider.generate(prompt);

      expect(response.content).toBeTruthy();
      // Should contain CSS selector syntax
      expect(response.content).toMatch(/[.#\[]|button|cart/i);

      console.log('✅ Selector suggestions:', response.content);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle rate limiting gracefully', async () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      // Make multiple rapid requests to test rate limiting
      const promises = Array(3)
        .fill(null)
        .map((_, i) => provider.generate(`Test message ${i}`));

      const responses = await Promise.all(promises);

      // All should succeed (or handle rate limits)
      responses.forEach((response) => {
        expect(response.content).toBeTruthy();
      });

      console.log('✅ Rate limiting handled:', responses.length, 'requests');
    }, 60000);

    it('should handle long context', async () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      const longPrompt = 'Repeat: ' + 'test '.repeat(100);
      const response = await provider.generate(longPrompt);

      expect(response.content).toBeTruthy();
      expect(response.usage.promptTokens).toBeGreaterThan(100);

      console.log(
        '✅ Long context handled:',
        response.usage.promptTokens,
        'prompt tokens',
      );
    }, 30000);
  });

  describe('Token Usage Tracking', () => {
    it('should accurately report token usage', async () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      const response = await provider.generate('Hello');

      expect(response.usage).toBeDefined();
      expect(response.usage.promptTokens).toBeGreaterThan(0);
      expect(response.usage.completionTokens).toBeGreaterThan(0);
      expect(response.usage.totalTokens).toBe(
        response.usage.promptTokens + response.usage.completionTokens,
      );

      console.log('✅ Token usage:', {
        prompt: response.usage.promptTokens,
        completion: response.usage.completionTokens,
        total: response.usage.totalTokens,
      });
    }, 30000);
  });
});
