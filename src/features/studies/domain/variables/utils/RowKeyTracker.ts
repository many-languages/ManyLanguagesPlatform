/**
 * RowKeyTracker - tracks array structural identity for stable join keys
 * Manages a stack of rowKey frames for grouping observations
 */

import type { RowKeyEntry } from "../types"

/**
 * RowKeyTracker - manages a stack of rowKey frames
 * Each frame represents an array instance with its structural identity
 */
export class RowKeyTracker {
  private rowKeyStack: RowKeyEntry[] = []

  /**
   * Push a new rowKey frame when entering an array element
   * @param frame The array structural identity and index
   */
  push(frame: RowKeyEntry): void {
    this.rowKeyStack.push(frame)
  }

  /**
   * Pop the top rowKey frame when leaving an array element
   */
  pop(): void {
    this.rowKeyStack.pop()
  }

  /**
   * Read-only reference to the current rowKey stack
   * Callers must copy if they need a snapshot: [...tracker.rowKey]
   */
  get rowKey(): readonly RowKeyEntry[] {
    return this.rowKeyStack
  }
}
