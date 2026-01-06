import type { NewExtractionResult, ExtractionObservation } from "../types"
import type { JsonPath } from "./path"
import { Path } from "./path"
import { toSourcePath } from "./path"
import { ContextManager } from "./contextManager"
import { DiagnosticEngine } from "./diagnostics"
import { shouldEmit } from "./extractionPolicy"
import { emitObservation } from "./observationEmitter"

export interface WalkerOptions {
  maxDepth?: number
  maxNodes?: number
  maxObservations?: number
  componentId: number
}

const DEFAULT_OPTIONS: Required<Omit<WalkerOptions, "componentId">> = {
  maxDepth: 10,
  maxNodes: 10000,
  maxObservations: 50000,
}

/**
 * Walker - deterministic DFS traversal of JSON data
 * Extracts observations with full provenance and context tracking
 */
export function walk(data: any, options: WalkerOptions): NewExtractionResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const contextManager = new ContextManager()
  const diagnosticEngine = new DiagnosticEngine(opts.maxObservations)
  const observations: ExtractionObservation[] = []

  // Recursive walk function
  function walkRecursive(value: any, path: JsonPath, depth: number): void {
    // Check guardrails
    if (depth > opts.maxDepth) {
      diagnosticEngine.recordMaxDepthExceeded(depth, opts.maxDepth)
      return
    }

    diagnosticEngine.incrementNodeCount()
    if (diagnosticEngine.getStats().nodeCount > opts.maxNodes) {
      diagnosticEngine.recordMaxNodesExceeded()
      return
    }

    diagnosticEngine.updateDepth(depth)
    diagnosticEngine.checkDepth(depth)

    if (observations.length >= opts.maxObservations) {
      diagnosticEngine.recordMaxObservationsExceeded()
      return
    }

    // Check if we should emit this value
    if (shouldEmit(value)) {
      const context = contextManager.getContext()
      const observation = emitObservation(path, value, context, opts.componentId)
      observations.push(observation)
      diagnosticEngine.recordObservation(observation)
      // Don't recurse into emitted values
      return
    }

    // Recurse based on type
    if (Array.isArray(value)) {
      // Array of objects or mixed: iterate with context tracking
      value.forEach((item, index) => {
        // Get the parent key for context (last key segment before array)
        const parentKey = Path.lastKey(path) || "item"
        contextManager.push(parentKey, index, depth + 1)
        const itemPath = Path.index(path, index)
        walkRecursive(item, itemPath, depth + 1)
        contextManager.pop()
      })
    } else if (typeof value === "object" && value !== null) {
      // Object: iterate key-value pairs
      Object.entries(value).forEach(([key, val]) => {
        const keyPath = Path.key(path, key)
        walkRecursive(val, keyPath, depth + 1)
      })
    } else {
      // Non-JSON type (function, symbol, undefined, etc.) - skip and record
      // Note: null is valid JSON and is handled as a primitive by shouldEmit
      const jsType = typeof value
      const pathString = toSourcePath(path)
      diagnosticEngine.recordSkippedNonJsonType(pathString, jsType)
    }
    // Primitives are already handled by shouldEmit
  }

  // Start walking from root
  walkRecursive(data, Path.root(), 0)

  // Get final diagnostics and stats
  const diagnostics = diagnosticEngine.getDiagnostics()
  const stats = diagnosticEngine.getStats()

  return {
    observations,
    diagnostics,
    stats,
  }
}
