import type { ExtractionStats } from "../types"

/**
 * StatsTracker - tracks extraction statistics
 * Tracks nodeCount, observationCount, and maxDepth
 */
export class StatsTracker {
  private stats = {
    nodeCount: 0,
    observationCount: 0,
    maxDepth: 0,
  }

  /**
   * Record a node visit
   */
  recordNodeCount(): void {
    this.stats.nodeCount++
  }

  /**
   * Record an observation
   */
  recordObservationCount(): void {
    this.stats.observationCount++
  }

  /**
   * Record max depth seen
   */
  recordDepth(depth: number): void {
    if (depth > this.stats.maxDepth) {
      this.stats.maxDepth = depth
    }
  }

  /**
   * Get current statistics
   */
  getStats(): ExtractionStats {
    return {
      nodeCount: this.stats.nodeCount,
      observationCount: this.stats.observationCount,
      maxDepth: this.stats.maxDepth,
    }
  }

  /**
   * Get node count
   */
  getNodeCount(): number {
    return this.stats.nodeCount
  }

  /**
   * Get observation count
   */
  getObservationCount(): number {
    return this.stats.observationCount
  }

  /**
   * Get max depth
   */
  getMaxDepth(): number {
    return this.stats.maxDepth
  }
}
