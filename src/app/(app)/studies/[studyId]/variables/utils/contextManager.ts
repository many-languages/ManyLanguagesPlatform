/**
 * Stack-based context tracking for grouping observations
 * Tracks instance keys (e.g., trials_index, responses_index) for joining observations
 */

export type ContextFrame = Record<string, string | number>

/**
 * Context Manager - manages a stack of context frames
 * Each frame represents context from an array traversal (e.g., { trials_index: 0 })
 * Maintains a cached merged context for efficiency
 */
export class ContextManager {
  private stack: ContextFrame[] = []
  private mergedContext: Record<string, string | number> = {}

  /**
   * Push a new context frame when entering an array element
   * @param arrayKey The key of the array being traversed (e.g., "trials")
   * @param index The index of the current array element
   * @param depth The nesting depth (used for collision handling)
   */
  push(arrayKey: string, index: number, depth: number): void {
    let contextKey = this.deriveContextKey(arrayKey)

    // Handle collisions: if key exists, append depth
    if (contextKey in this.mergedContext) {
      contextKey = `${contextKey}_${depth}`
    }

    const frame: ContextFrame = { [contextKey]: index }
    this.stack.push(frame)

    // Update cached merged context directly (no merging needed)
    this.mergedContext[contextKey] = index
  }

  /**
   * Pop the top context frame when leaving an array element
   */
  pop(): void {
    const frame = this.stack.pop()
    if (frame) {
      const key = Object.keys(frame)[0]
      delete this.mergedContext[key]
    }
  }

  /**
   * Get the merged context from all frames in the stack
   * Returns a copy of the cached merged context
   */
  getContext(): Record<string, string | number> {
    return { ...this.mergedContext }
  }

  /**
   * Derive a context key from an array key
   * Examples:
   * - "trials" → "trials_index"
   * - "responses" → "responses_index"
   * - "items" → "items_index"
   * - "data" → "data_index"
   *
   * Always uses the array key as-is with "_index" suffix for consistency
   */
  private deriveContextKey(arrayKey: string): string {
    return `${arrayKey}_index`
  }

  /**
   * Get the current depth of the context stack
   */
  getDepth(): number {
    return this.stack.length
  }

  /**
   * Clear all context frames and merged context
   */
  clear(): void {
    this.stack = []
    this.mergedContext = {}
  }
}
