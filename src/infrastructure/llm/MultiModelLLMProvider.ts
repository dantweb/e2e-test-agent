/**
 * Multi-Model LLM Provider with Fallback - Sprint 13
 *
 * Provides intelligent fallback across multiple LLM providers and models.
 * Features:
 * - Automatic failover on errors
 * - Cost-based model selection
 * - Load balancing across providers
 * - Retry logic with exponential backoff
 */

import { ILLMProvider, LLMContext, LLMResponse } from './interfaces';
import { LLMCostTracker } from './LLMCostTracker';
import { PromptCache } from './PromptCache';

export interface ProviderConfig {
  /** Provider instance */
  provider: ILLMProvider;

  /** Provider name for logging */
  name: string;

  /** Priority (lower = higher priority) */
  priority: number;

  /** Maximum retries for this provider */
  maxRetries?: number;

  /** Timeout in milliseconds */
  timeoutMs?: number;
}

export interface FallbackOptions {
  /** Enable cost tracking */
  enableCostTracking?: boolean;

  /** Enable prompt caching */
  enableCaching?: boolean;

  /** Maximum total attempts across all providers */
  maxTotalAttempts?: number;

  /** Budget limit in USD */
  budgetLimitUSD?: number;
}

/**
 * Multi-Model LLM Provider with intelligent fallback
 *
 * Usage:
 * ```typescript
 * const multiProvider = new MultiModelLLMProvider({
 *   enableCostTracking: true,
 *   enableCaching: true,
 *   budgetLimitUSD: 10.0,
 * });
 *
 * // Add providers in priority order
 * multiProvider.addProvider({
 *   provider: new OpenAILLMProvider(apiKey),
 *   name: 'openai-gpt4',
 *   priority: 1,
 * });
 *
 * multiProvider.addProvider({
 *   provider: new AnthropicLLMProvider(apiKey),
 *   name: 'anthropic-claude',
 *   priority: 2,
 * });
 *
 * // Generate with automatic fallback
 * const response = await multiProvider.generate(prompt, context);
 * ```
 */
export class MultiModelLLMProvider implements ILLMProvider {
  private providers: ProviderConfig[] = [];
  private costTracker?: LLMCostTracker;
  private cache?: PromptCache<LLMResponse>;

  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    fallbacks: 0,
    cacheHits: 0,
  };

  constructor(private readonly options: FallbackOptions = {}) {
    if (options.enableCostTracking) {
      this.costTracker = new LLMCostTracker(options.budgetLimitUSD);
    }

    if (options.enableCaching) {
      this.cache = new PromptCache<LLMResponse>();
    }
  }

  /**
   * Add a provider to the fallback chain
   */
  addProvider(config: ProviderConfig): void {
    this.providers.push(config);

    // Sort by priority (lower number = higher priority)
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a provider by name
   */
  removeProvider(name: string): boolean {
    const index = this.providers.findIndex(p => p.name === name);

    if (index === -1) {
      return false;
    }

    this.providers.splice(index, 1);
    return true;
  }

  /**
   * Generate response with automatic fallback
   */
  async generate(prompt: string, context?: LLMContext): Promise<LLMResponse> {
    this.stats.totalRequests++;

    if (this.providers.length === 0) {
      throw new Error('No providers configured');
    }

    // Check cache first
    if (this.cache && context?.enableCache !== false) {
      const cacheKey =
        context?.cacheKey || PromptCache.generateKey(prompt, context);

      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return {
          ...cached,
          cached: true,
        };
      }
    }

    // Check budget before making request
    if (context?.maxCost && this.costTracker) {
      const remaining = this.costTracker.getRemainingBudget();
      if (remaining !== undefined && remaining < context.maxCost) {
        throw new Error(
          `Insufficient budget: Need $${context.maxCost.toFixed(4)}, ` +
          `Remaining $${remaining.toFixed(4)}`
        );
      }
    }

    const maxAttempts = this.options.maxTotalAttempts || 3;
    let lastError: Error | null = null;
    let attemptCount = 0;

    // Try each provider in priority order
    for (const config of this.providers) {
      const maxRetries = config.maxRetries || 2;

      for (let retry = 0; retry < maxRetries; retry++) {
        attemptCount++;

        if (attemptCount > maxAttempts) {
          break;
        }

        try {
          const startTime = Date.now();

          // Make request with timeout
          const response = await this.makeRequestWithTimeout(
            config,
            prompt,
            context,
            config.timeoutMs || 30000
          );

          const latencyMs = Date.now() - startTime;
          response.latencyMs = latencyMs;

          // Track cost
          if (this.costTracker && response.usage) {
            const cost = this.costTracker.calculateCost(
              response.model,
              response.usage.promptTokens,
              response.usage.completionTokens,
              response.usage.cachedTokens
            );

            this.costTracker.trackRequest({
              model: response.model,
              provider: config.name,
              inputTokens: response.usage.promptTokens,
              outputTokens: response.usage.completionTokens,
              cachedTokens: response.usage.cachedTokens,
              tags: context?.tags,
              latencyMs,
            });

            response.estimatedCost = cost;
          }

          // Cache response
          if (this.cache && context?.enableCache !== false) {
            const cacheKey =
              context?.cacheKey || PromptCache.generateKey(prompt, context);
            this.cache.set(cacheKey, response);
          }

          this.stats.successfulRequests++;
          return response;
        } catch (error) {
          lastError = error as Error;
          console.warn(
            `Provider ${config.name} attempt ${retry + 1}/${maxRetries} failed:`,
            error
          );

          if (retry < maxRetries - 1) {
            // Exponential backoff
            const delayMs = Math.min(1000 * Math.pow(2, retry), 5000);
            await this.sleep(delayMs);
          }
        }
      }

      // Track fallback if we're moving to next provider
      if (this.providers.indexOf(config) < this.providers.length - 1) {
        this.stats.fallbacks++;
      }
    }

    // All providers failed
    this.stats.failedRequests++;
    throw new Error(
      `All providers failed after ${attemptCount} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Stream generate with fallback (uses first available provider)
   */
  async *streamGenerate(
    prompt: string,
    context?: LLMContext
  ): AsyncGenerator<string, void, unknown> {
    if (this.providers.length === 0) {
      throw new Error('No providers configured');
    }

    // Use first provider for streaming (no fallback for streams)
    const provider = this.providers[0];

    try {
      for await (const chunk of provider.provider.streamGenerate(prompt, context)) {
        yield chunk;
      }
    } catch (error) {
      throw new Error(
        `Streaming failed from ${provider.name}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Make request with timeout
   */
  private async makeRequestWithTimeout(
    config: ProviderConfig,
    prompt: string,
    context: LLMContext | undefined,
    timeoutMs: number
  ): Promise<LLMResponse> {
    return Promise.race([
      config.provider.generate(prompt, context),
      this.timeoutPromise(timeoutMs),
    ]);
  }

  /**
   * Create timeout promise
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics
   */
  getStats() {
    const successRate =
      this.stats.totalRequests > 0
        ? this.stats.successfulRequests / this.stats.totalRequests
        : 0;

    const cacheHitRate =
      this.stats.totalRequests > 0
        ? this.stats.cacheHits / this.stats.totalRequests
        : 0;

    return {
      ...this.stats,
      successRate,
      cacheHitRate,
      costSummary: this.costTracker?.getSummary(),
      cacheStats: this.cache?.getStats(),
    };
  }

  /**
   * Get cost tracker instance
   */
  getCostTracker(): LLMCostTracker | undefined {
    return this.costTracker;
  }

  /**
   * Get cache instance
   */
  getCache(): PromptCache<LLMResponse> | undefined {
    return this.cache;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      fallbacks: 0,
      cacheHits: 0,
    };

    this.costTracker?.reset();
    this.cache?.clear();
  }

  /**
   * Get list of configured providers
   */
  getProviders(): Array<{ name: string; priority: number }> {
    return this.providers.map(p => ({
      name: p.name,
      priority: p.priority,
    }));
  }
}
