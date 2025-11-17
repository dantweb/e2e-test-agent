/**
 * Memory Leak Detector - Sprint 14
 *
 * Monitors memory usage over time to detect potential memory leaks.
 * Provides alerts and detailed reports for investigation.
 */

export interface MemorySnapshot {
  timestamp: Date;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface LeakDetectionResult {
  leakDetected: boolean;
  confidence: 'low' | 'medium' | 'high';
  growthRate: number; // bytes per snapshot
  totalGrowth: number; // bytes
  snapshots: MemorySnapshot[];
  recommendations: string[];
}

/**
 * Memory Leak Detector
 *
 * Usage:
 * ```typescript
 * const detector = new MemoryLeakDetector({
 *   snapshotInterval: 1000, // 1 second
 *   minSnapshots: 10,
 *   growthThreshold: 1024 * 1024, // 1MB
 * });
 *
 * detector.start();
 *
 * // ... run your code ...
 *
 * await detector.stop();
 * const result = detector.analyze();
 *
 * if (result.leakDetected) {
 *   console.warn('Memory leak detected!', result);
 * }
 * ```
 */
export class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private intervalId?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly options: {
      /** Interval between snapshots in milliseconds */
      snapshotInterval?: number;
      /** Minimum snapshots needed for analysis */
      minSnapshots?: number;
      /** Growth threshold in bytes to consider a leak */
      growthThreshold?: number;
      /** Enable detailed logging */
      verbose?: boolean;
    } = {}
  ) {
    this.options = {
      snapshotInterval: 1000,
      minSnapshots: 10,
      growthThreshold: 1024 * 1024, // 1MB default
      verbose: false,
      ...options,
    };
  }

  /**
   * Start monitoring memory usage
   */
  start(): void {
    if (this.running) {
      throw new Error('Memory leak detector is already running');
    }

    this.running = true;
    this.snapshots = [];

    // Take initial snapshot
    this.takeSnapshot();

    // Schedule periodic snapshots
    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, this.options.snapshotInterval);

    if (this.options.verbose) {
      console.log('Memory leak detector started');
    }
  }

  /**
   * Stop monitoring and force garbage collection
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      // Wait a bit for GC to complete
      await this.sleep(100);
      // Take final snapshot after GC
      this.takeSnapshot();
    }

    this.running = false;

    if (this.options.verbose) {
      console.log(`Memory leak detector stopped (${this.snapshots.length} snapshots)`);
    }
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): void {
    if (typeof process === 'undefined' || !process.memoryUsage) {
      throw new Error('Memory monitoring not available in this environment');
    }

    const mem = process.memoryUsage();

    const snapshot: MemorySnapshot = {
      timestamp: new Date(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
    };

    this.snapshots.push(snapshot);

    if (this.options.verbose) {
      console.log(
        `Snapshot ${this.snapshots.length}: ` +
          `Heap ${this.formatBytes(snapshot.heapUsed)} / ${this.formatBytes(snapshot.heapTotal)}`
      );
    }
  }

  /**
   * Analyze snapshots for memory leaks
   */
  analyze(): LeakDetectionResult {
    if (this.snapshots.length < (this.options.minSnapshots || 10)) {
      return {
        leakDetected: false,
        confidence: 'low',
        growthRate: 0,
        totalGrowth: 0,
        snapshots: this.snapshots,
        recommendations: ['Insufficient snapshots for analysis. Need at least 10 snapshots.'],
      };
    }

    // Calculate linear regression for heap growth
    const { slope, totalGrowth } = this.calculateGrowthRate();

    const growthThreshold = this.options.growthThreshold || 1024 * 1024;
    const leakDetected = totalGrowth > growthThreshold && slope > 0;

    // Determine confidence level
    let confidence: 'low' | 'medium' | 'high' = 'low';

    if (leakDetected) {
      // Check consistency of growth
      const consistency = this.checkGrowthConsistency();

      if (consistency > 0.8 && totalGrowth > growthThreshold * 2) {
        confidence = 'high';
      } else if (consistency > 0.6 || totalGrowth > growthThreshold * 1.5) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }
    }

    const recommendations = this.generateRecommendations(leakDetected, slope, totalGrowth);

    return {
      leakDetected,
      confidence,
      growthRate: slope,
      totalGrowth,
      snapshots: this.snapshots,
      recommendations,
    };
  }

  /**
   * Calculate memory growth rate using linear regression
   */
  private calculateGrowthRate(): { slope: number; totalGrowth: number } {
    if (this.snapshots.length < 2) {
      return { slope: 0, totalGrowth: 0 };
    }

    const n = this.snapshots.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = this.snapshots.map(s => s.heapUsed);

    // Calculate means
    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;

    // Calculate slope (linear regression)
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += Math.pow(x[i] - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // Total growth
    const totalGrowth = y[y.length - 1] - y[0];

    return { slope, totalGrowth };
  }

  /**
   * Check consistency of memory growth
   *
   * Returns a value between 0 and 1, where 1 means perfectly consistent growth
   */
  private checkGrowthConsistency(): number {
    if (this.snapshots.length < 3) {
      return 0;
    }

    const growths: number[] = [];

    for (let i = 1; i < this.snapshots.length; i++) {
      const growth = this.snapshots[i].heapUsed - this.snapshots[i - 1].heapUsed;
      growths.push(growth);
    }

    // Calculate coefficient of variation (lower = more consistent)
    const mean = growths.reduce((sum, g) => sum + g, 0) / growths.length;

    if (mean === 0) {
      return 0;
    }

    const variance =
      growths.reduce((sum, g) => sum + Math.pow(g - mean, 2), 0) / growths.length;

    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / Math.abs(mean);

    // Convert to consistency score (0-1)
    // Lower CV = higher consistency
    return Math.max(0, 1 - coefficientOfVariation);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    leakDetected: boolean,
    growthRate: number,
    _totalGrowth: number
  ): string[] {
    const recommendations: string[] = [];

    if (!leakDetected) {
      recommendations.push('✅ No significant memory leak detected');
      recommendations.push('Memory usage is stable within acceptable limits');
      return recommendations;
    }

    recommendations.push('⚠️  Potential memory leak detected!');
    recommendations.push('');

    recommendations.push('Immediate Actions:');
    recommendations.push('1. Review event listener registrations (ensure cleanup)');
    recommendations.push('2. Check for circular references preventing garbage collection');
    recommendations.push('3. Verify setTimeout/setInterval are properly cleared');
    recommendations.push('4. Inspect large data structures for unnecessary retention');
    recommendations.push('');

    if (growthRate > 10000) {
      // Growing > 10KB per snapshot
      recommendations.push('Severity: HIGH');
      recommendations.push('- Memory is growing rapidly');
      recommendations.push('- Check for large object accumulation');
      recommendations.push('- Profile heap allocations');
    } else if (growthRate > 1000) {
      recommendations.push('Severity: MEDIUM');
      recommendations.push('- Gradual memory increase detected');
      recommendations.push('- Monitor over longer period');
    } else {
      recommendations.push('Severity: LOW');
      recommendations.push('- Slow memory growth detected');
      recommendations.push('- May be acceptable for long-running processes');
    }

    recommendations.push('');
    recommendations.push('Debugging Tools:');
    recommendations.push('- Use Chrome DevTools Memory Profiler');
    recommendations.push('- Run with --expose-gc flag for manual GC testing');
    recommendations.push('- Use heapdump module for detailed analysis');

    return recommendations;
  }

  /**
   * Get formatted report
   */
  getFormattedReport(): string {
    const result = this.analyze();
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('MEMORY LEAK DETECTION REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    lines.push(`Status:        ${result.leakDetected ? '⚠️  LEAK DETECTED' : '✅ NO LEAK'}`);
    lines.push(`Confidence:    ${result.confidence.toUpperCase()}`);
    lines.push(`Snapshots:     ${result.snapshots.length}`);
    lines.push(`Growth Rate:   ${this.formatBytes(result.growthRate)}/snapshot`);
    lines.push(`Total Growth:  ${this.formatBytes(result.totalGrowth)}`);
    lines.push('');

    if (result.snapshots.length > 0) {
      const first = result.snapshots[0];
      const last = result.snapshots[result.snapshots.length - 1];

      lines.push('Memory Usage:');
      lines.push(`  Initial:  ${this.formatBytes(first.heapUsed)}`);
      lines.push(`  Final:    ${this.formatBytes(last.heapUsed)}`);
      lines.push(`  Change:   ${this.formatBytes(last.heapUsed - first.heapUsed)}`);
      lines.push('');
    }

    lines.push('Recommendations:');
    for (const rec of result.recommendations) {
      lines.push(`  ${rec}`);
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Get snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return this.snapshots;
  }

  /**
   * Clear snapshots
   */
  clear(): void {
    this.snapshots = [];
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const absBytes = Math.abs(bytes);
    const sign = bytes < 0 ? '-' : '';

    if (absBytes < 1024) return `${sign}${absBytes} B`;
    if (absBytes < 1024 * 1024) return `${sign}${(absBytes / 1024).toFixed(2)} KB`;
    if (absBytes < 1024 * 1024 * 1024)
      return `${sign}${(absBytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${sign}${(absBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
