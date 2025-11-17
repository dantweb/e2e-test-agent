/**
 * Performance Benchmark Utility - Sprint 14
 *
 * Provides tools for measuring and reporting performance metrics.
 * Helps identify bottlenecks and track performance over time.
 */

export interface BenchmarkResult {
  name: string;
  duration: number; // milliseconds
  memoryUsed: number; // bytes
  iterations: number;
  avgDuration: number; // milliseconds per iteration
  minDuration: number;
  maxDuration: number;
  stdDeviation: number;
  timestamp: Date;
}

export interface BenchmarkReport {
  results: BenchmarkResult[];
  totalDuration: number;
  totalMemoryUsed: number;
  summary: {
    fastest: string;
    slowest: string;
    avgDuration: number;
    totalIterations: number;
  };
}

/**
 * Performance Benchmark Runner
 *
 * Usage:
 * ```typescript
 * const benchmark = new PerformanceBenchmark();
 *
 * await benchmark.run('Task Decomposition', async () => {
 *   await decomposer.decomposeTask(task);
 * }, { iterations: 100 });
 *
 * const report = benchmark.getReport();
 * console.log(report);
 * ```
 */
export class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Run a benchmark test
   *
   * @param name Benchmark name
   * @param fn Function to benchmark
   * @param options Benchmark options
   * @returns Benchmark result
   */
  async run(
    name: string,
    fn: () => Promise<void> | void,
    options: {
      iterations?: number;
      warmupIterations?: number;
    } = {}
  ): Promise<BenchmarkResult> {
    const { iterations = 10, warmupIterations = 3 } = options;

    // Warmup phase (excluded from results)
    for (let i = 0; i < warmupIterations; i++) {
      await fn();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const durations: number[] = [];
    const startMemory = this.getMemoryUsage();

    // Measurement phase
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      durations.push(end - start);
    }

    const endMemory = this.getMemoryUsage();
    const memoryUsed = endMemory - startMemory;

    // Calculate statistics
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const avgDuration = totalDuration / iterations;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const stdDeviation = this.calculateStdDev(durations, avgDuration);

    const result: BenchmarkResult = {
      name,
      duration: totalDuration,
      memoryUsed,
      iterations,
      avgDuration,
      minDuration,
      maxDuration,
      stdDeviation,
      timestamp: new Date(),
    };

    this.results.push(result);
    return result;
  }

  /**
   * Run multiple benchmarks in sequence
   *
   * @param benchmarks Array of [name, function] pairs
   * @param options Benchmark options
   * @returns Array of results
   */
  async runSuite(
    benchmarks: Array<[string, () => Promise<void> | void]>,
    options?: { iterations?: number; warmupIterations?: number }
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const [name, fn] of benchmarks) {
      const result = await this.run(name, fn, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Get comprehensive benchmark report
   */
  getReport(): BenchmarkReport {
    if (this.results.length === 0) {
      return {
        results: [],
        totalDuration: 0,
        totalMemoryUsed: 0,
        summary: {
          fastest: '',
          slowest: '',
          avgDuration: 0,
          totalIterations: 0,
        },
      };
    }

    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const totalMemoryUsed = this.results.reduce((sum, r) => sum + r.memoryUsed, 0);
    const totalIterations = this.results.reduce((sum, r) => sum + r.iterations, 0);
    const avgDuration = totalDuration / totalIterations;

    // Find fastest and slowest
    const sorted = [...this.results].sort((a, b) => a.avgDuration - b.avgDuration);
    const fastest = sorted[0]?.name || '';
    const slowest = sorted[sorted.length - 1]?.name || '';

    return {
      results: this.results,
      totalDuration,
      totalMemoryUsed,
      summary: {
        fastest,
        slowest,
        avgDuration,
        totalIterations,
      },
    };
  }

  /**
   * Get formatted report as string
   */
  getFormattedReport(): string {
    const report = this.getReport();
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('PERFORMANCE BENCHMARK REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    for (const result of report.results) {
      lines.push(`${result.name}:`);
      lines.push(`  Iterations:     ${result.iterations}`);
      lines.push(`  Total Duration: ${result.duration.toFixed(2)}ms`);
      lines.push(`  Avg Duration:   ${result.avgDuration.toFixed(2)}ms`);
      lines.push(`  Min Duration:   ${result.minDuration.toFixed(2)}ms`);
      lines.push(`  Max Duration:   ${result.maxDuration.toFixed(2)}ms`);
      lines.push(`  Std Deviation:  ${result.stdDeviation.toFixed(2)}ms`);
      lines.push(`  Memory Used:    ${this.formatBytes(result.memoryUsed)}`);
      lines.push('');
    }

    lines.push('-'.repeat(80));
    lines.push('SUMMARY:');
    lines.push(`  Total Duration:   ${report.totalDuration.toFixed(2)}ms`);
    lines.push(`  Total Iterations: ${report.summary.totalIterations}`);
    lines.push(`  Avg Duration:     ${report.summary.avgDuration.toFixed(2)}ms`);
    lines.push(`  Memory Used:      ${this.formatBytes(report.totalMemoryUsed)}`);
    lines.push(`  Fastest:          ${report.summary.fastest}`);
    lines.push(`  Slowest:          ${report.summary.slowest}`);
    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Export results as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.getReport(), null, 2);
  }

  /**
   * Clear all results
   */
  clear(): void {
    this.results = [];
  }

  /**
   * Get current memory usage in bytes
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Compare two benchmark results
   */
  static compare(baseline: BenchmarkResult, current: BenchmarkResult): {
    durationChange: number; // percentage
    memoryChange: number; // percentage
    faster: boolean;
    lighter: boolean;
  } {
    const durationChange =
      ((current.avgDuration - baseline.avgDuration) / baseline.avgDuration) * 100;

    const memoryChange =
      ((current.memoryUsed - baseline.memoryUsed) / baseline.memoryUsed) * 100;

    return {
      durationChange,
      memoryChange,
      faster: durationChange < 0,
      lighter: memoryChange < 0,
    };
  }
}

/**
 * Simple timer for ad-hoc performance measurement
 *
 * Usage:
 * ```typescript
 * const timer = new PerformanceTimer('Operation');
 * timer.start();
 * // ... do work ...
 * timer.stop();
 * console.log(timer.getResult());
 * ```
 */
export class PerformanceTimer {
  private startTime?: number;
  private endTime?: number;
  private startMemory?: number;
  private endMemory?: number;

  constructor(private readonly name: string) {}

  /**
   * Start timing
   */
  start(): void {
    this.startMemory = this.getMemoryUsage();
    this.startTime = performance.now();
  }

  /**
   * Stop timing
   */
  stop(): void {
    this.endTime = performance.now();
    this.endMemory = this.getMemoryUsage();
  }

  /**
   * Get timing result
   */
  getResult(): { name: string; duration: number; memoryUsed: number } | null {
    if (!this.startTime || !this.endTime) {
      return null;
    }

    return {
      name: this.name,
      duration: this.endTime - this.startTime,
      memoryUsed: (this.endMemory || 0) - (this.startMemory || 0),
    };
  }

  /**
   * Reset timer
   */
  reset(): void {
    this.startTime = undefined;
    this.endTime = undefined;
    this.startMemory = undefined;
    this.endMemory = undefined;
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }
}
