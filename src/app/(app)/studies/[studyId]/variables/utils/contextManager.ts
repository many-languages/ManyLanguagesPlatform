/**
 * Stack-based rowKey tracking for grouping observations
 * Tracks array structural identity for stable join keys
 */

import type { RowKeyEntry } from "../types"

export type ContextFrame = { arrayKey: string; index: number }

/**
 * Context Manager - manages a stack of rowKey frames
 * Each frame represents an array instance with its structural identity
 * Owns the rowKeyStack for tracking array nesting
 */
export class ContextManager {
  private rowKeyStack: RowKeyEntry[] = []

  /**
   * Push a new rowKey frame when entering an array element
   * @param frame The array structural identity and index
   */
  push(frame: ContextFrame): void {
    this.rowKeyStack.push(frame)
  }

  /**
   * Pop the top rowKey frame when leaving an array element
   */
  pop(): void {
    this.rowKeyStack.pop()
  }

  /**
   * Get the current rowKey stack (copy)
   * Returns a copy of the current rowKey array
   */
  getRowKey(): RowKeyEntry[] {
    return [...this.rowKeyStack]
  }

  /**
   * Get the current depth of the rowKey stack
   */
  getDepth(): number {
    return this.rowKeyStack.length
  }

  /**
   * Clear all rowKey frames
   */
  clear(): void {
    this.rowKeyStack = []
  }
}
