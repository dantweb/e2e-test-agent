/**
 * LLM Cost Tracker - Sprint 13
 *
 * Tracks and estimates costs for LLM API calls across different providers and models.
 * Provides cost analytics, budgeting, and optimization insights.
 */

export interface ModelPricing {
  /** Cost per 1M input tokens (USD) */
  inputCostPer1M: number;

  /** Cost per 1M output tokens (USD) */
  outputCostPer1M: number;

  /** Cost per 1M cached input tokens (USD) - for providers supporting caching */
  cachedInputCostPer1M?: number;
}

export interface CostRecord {
  /** Timestamp of the request */
  timestamp: Date;

  /** Model used */
  model: string;

  /** Provider (openai, anthropic, etc.) */
  provider: string;

  /** Input tokens */
  inputTokens: number;

  /** Output tokens */
  outputTokens: number;

  /** Cached tokens (if applicable) */
  cachedTokens?: number;

  /** Estimated cost in USD */
  cost: number;

  /** Tags for categorization */
  tags?: string[];

  /** Latency in milliseconds */
  latencyMs?: number;
}

export interface CostSummary {
  /** Total cost in USD */
  totalCost: number;

  /** Total requests */
  totalRequests: number;

  /** Total tokens (input + output) */
  totalTokens: number;

  /** Average cost per request */
  avgCostPerRequest: number;

  /** Average tokens per request */
  avgTokensPerRequest: number;

  /** Cost breakdown by model */
  byModel: Map<string, number>;

  /** Cost breakdown by provider */
  byProvider: Map<string, number>;

  /** Cost breakdown by tag */
  byTag: Map<string, number>;

  /** Total cached tokens (cost savings) */
  cachedTokensSaved?: number;

  /** Estimated savings from caching (USD) */
  cacheSavings?: number;
}

/**
 * Pricing table for popular LLM models (as of November 2025)
 */
const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI GPT-4
  'gpt-4': {
    inputCostPer1M: 30.0,
    outputCostPer1M: 60.0,
  },
  'gpt-4-turbo': {
    inputCostPer1M: 10.0,
    outputCostPer1M: 30.0,
  },
  'gpt-4-turbo-preview': {
    inputCostPer1M: 10.0,
    outputCostPer1M: 30.0,
  },

  // OpenAI GPT-3.5
  'gpt-3.5-turbo': {
    inputCostPer1M: 0.5,
    outputCostPer1M: 1.5,
  },
  'gpt-3.5-turbo-16k': {
    inputCostPer1M: 3.0,
    outputCostPer1M: 4.0,
  },

  // Anthropic Claude 3
  'claude-3-opus-20240229': {
    inputCostPer1M: 15.0,
    outputCostPer1M: 75.0,
    cachedInputCostPer1M: 1.5, // 90% discount for cached tokens
  },
  'claude-3-sonnet-20240229': {
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    cachedInputCostPer1M: 0.3,
  },
  'claude-3-haiku-20240307': {
    inputCostPer1M: 0.25,
    outputCostPer1M: 1.25,
    cachedInputCostPer1M: 0.025,
  },

  // DeepSeek (Chinese models)
  'deepseek-chat': {
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
  },
  'deepseek-coder': {
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
  },
};

/**
 * LLM Cost Tracker
 *
 * Usage:
 * ```typescript
 * const tracker = new LLMCostTracker();
 *
 * // Track a request
 * const cost = tracker.trackRequest({
 *   model: 'gpt-4',
 *   provider: 'openai',
 *   inputTokens: 1000,
 *   outputTokens: 500,
 *   tags: ['test-generation'],
 * });
 *
 * // Get summary
 * const summary = tracker.getSummary();
 * console.log(`Total cost: $${summary.totalCost.toFixed(4)}`);
 * ```
 */
export class LLMCostTracker {
  private records: CostRecord[] = [];
  private budgetLimit?: number;

  constructor(budgetLimitUSD?: number) {
    this.budgetLimit = budgetLimitUSD;
  }

  /**
   * Calculate cost for a request
   *
   * @param model Model name
   * @param inputTokens Input tokens
   * @param outputTokens Output tokens
   * @param cachedTokens Cached tokens (optional)
   * @returns Estimated cost in USD
   */
  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cachedTokens?: number
  ): number {
    const pricing = MODEL_PRICING[model];

    if (!pricing) {
      // Unknown model - use GPT-4 pricing as conservative estimate
      return this.calculateCost('gpt-4', inputTokens, outputTokens, cachedTokens);
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPer1M;

    let cachedCost = 0;
    if (cachedTokens && pricing.cachedInputCostPer1M) {
      cachedCost = (cachedTokens / 1_000_000) * pricing.cachedInputCostPer1M;
    }

    return inputCost + outputCost + cachedCost;
  }

  /**
   * Track a single LLM request
   *
   * @param record Request details
   * @returns Estimated cost
   * @throws Error if budget limit exceeded
   */
  trackRequest(
    record: Omit<CostRecord, 'timestamp' | 'cost'>
  ): number {
    const cost = this.calculateCost(
      record.model,
      record.inputTokens,
      record.outputTokens,
      record.cachedTokens
    );

    // Check budget limit
    if (this.budgetLimit) {
      const currentCost = this.getTotalCost();
      if (currentCost + cost > this.budgetLimit) {
        throw new Error(
          `Budget limit exceeded: Current $${currentCost.toFixed(4)} + ` +
          `Request $${cost.toFixed(4)} > Limit $${this.budgetLimit.toFixed(4)}`
        );
      }
    }

    this.records.push({
      ...record,
      timestamp: new Date(),
      cost,
    });

    return cost;
  }

  /**
   * Get total cost across all tracked requests
   */
  getTotalCost(): number {
    return this.records.reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Get comprehensive cost summary
   */
  getSummary(): CostSummary {
    if (this.records.length === 0) {
      return {
        totalCost: 0,
        totalRequests: 0,
        totalTokens: 0,
        avgCostPerRequest: 0,
        avgTokensPerRequest: 0,
        byModel: new Map(),
        byProvider: new Map(),
        byTag: new Map(),
      };
    }

    const totalCost = this.getTotalCost();
    const totalTokens = this.records.reduce(
      (sum, r) => sum + r.inputTokens + r.outputTokens,
      0
    );

    const byModel = new Map<string, number>();
    const byProvider = new Map<string, number>();
    const byTag = new Map<string, number>();

    let cachedTokensSaved = 0;
    let cacheSavings = 0;

    for (const record of this.records) {
      // By model
      byModel.set(record.model, (byModel.get(record.model) || 0) + record.cost);

      // By provider
      byProvider.set(
        record.provider,
        (byProvider.get(record.provider) || 0) + record.cost
      );

      // By tag
      if (record.tags) {
        for (const tag of record.tags) {
          byTag.set(tag, (byTag.get(tag) || 0) + record.cost);
        }
      }

      // Cache savings
      if (record.cachedTokens) {
        cachedTokensSaved += record.cachedTokens;

        const pricing = MODEL_PRICING[record.model];
        if (pricing && pricing.cachedInputCostPer1M && pricing.inputCostPer1M) {
          const fullCost = (record.cachedTokens / 1_000_000) * pricing.inputCostPer1M;
          const cachedCost =
            (record.cachedTokens / 1_000_000) * pricing.cachedInputCostPer1M;
          cacheSavings += fullCost - cachedCost;
        }
      }
    }

    return {
      totalCost,
      totalRequests: this.records.length,
      totalTokens,
      avgCostPerRequest: totalCost / this.records.length,
      avgTokensPerRequest: totalTokens / this.records.length,
      byModel,
      byProvider,
      byTag,
      cachedTokensSaved: cachedTokensSaved > 0 ? cachedTokensSaved : undefined,
      cacheSavings: cacheSavings > 0 ? cacheSavings : undefined,
    };
  }

  /**
   * Get records filtered by criteria
   */
  getRecords(filter?: {
    model?: string;
    provider?: string;
    tags?: string[];
    since?: Date;
  }): CostRecord[] {
    let filtered = this.records;

    if (filter?.model) {
      filtered = filtered.filter(r => r.model === filter.model);
    }

    if (filter?.provider) {
      filtered = filtered.filter(r => r.provider === filter.provider);
    }

    if (filter?.tags) {
      filtered = filtered.filter(r =>
        r.tags?.some(tag => filter.tags?.includes(tag))
      );
    }

    if (filter?.since) {
      filtered = filtered.filter(r => r.timestamp >= filter.since!);
    }

    return filtered;
  }

  /**
   * Reset tracking (clear all records)
   */
  reset(): void {
    this.records = [];
  }

  /**
   * Set or update budget limit
   */
  setBudgetLimit(limitUSD: number): void {
    this.budgetLimit = limitUSD;
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): number | undefined {
    if (!this.budgetLimit) {
      return undefined;
    }

    return Math.max(0, this.budgetLimit - this.getTotalCost());
  }

  /**
   * Export records as JSON
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        records: this.records,
        summary: this.getSummary(),
        budgetLimit: this.budgetLimit,
      },
      null,
      2
    );
  }

  /**
   * Get recommended model based on cost/performance tradeoff
   *
   * @param useCase 'simple' | 'medium' | 'complex'
   * @returns Recommended model name
   */
  static getRecommendedModel(useCase: 'simple' | 'medium' | 'complex'): string {
    switch (useCase) {
      case 'simple':
        return 'claude-3-haiku-20240307'; // Fastest & cheapest
      case 'medium':
        return 'claude-3-sonnet-20240229'; // Balanced
      case 'complex':
        return 'claude-3-opus-20240229'; // Most capable
      default:
        return 'gpt-4-turbo';
    }
  }
}
