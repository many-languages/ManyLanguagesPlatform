import type { ExtractionObservation, RowKeyEntry, ScopeKeys } from "../types"
import type { JsonPath } from "./path"
import { Path } from "./path"
import { toSourcePath, toVariableKey } from "./path"
import { ContextManager } from "./contextManager"
import { DiagnosticEngine } from "./diagnostics"
import { shouldEmit } from "./extractionPolicy"
import { emitObservation } from "./observationEmitter"

export interface WalkerOptions {
  maxDepth?: number
  maxNodes?: number
  maxObservations?: number
  componentId: number
  scopeKeys?: Partial<ScopeKeys> // Optional scope keys (componentId is required, others optional)
}

const DEFAULT_OPTIONS: Required<Omit<WalkerOptions, "componentId" | "scopeKeys">> = {
  maxDepth: 10,
  maxNodes: 10000,
  maxObservations: 50000,
}

/**
 * Walker - deterministic DFS traversal of JSON data
 * Extracts observations with full provenance and context tracking
 * Stats are tracked in the shared diagnosticEngine
 */
export function walk(
  data: any,
  options: WalkerOptions,
  diagnosticEngine: DiagnosticEngine
): { observations: ExtractionObservation[] } {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const contextManager = new ContextManager()
  const observations: ExtractionObservation[] = []

  // Build scopeKeys from options (componentId is required, others optional)
  const scopeKeys: ScopeKeys = {
    ...(opts.scopeKeys || {}),
    componentId: opts.componentId,
  }

  // Recursive walk function
  function walkRecursive(value: any, path: JsonPath, depth: number): void {
    // Check guardrails
    if (depth > opts.maxDepth) {
      diagnosticEngine.emitMaxDepthExceeded(depth, opts.maxDepth)
      return
    }

    diagnosticEngine.recordNodeCount()
    if (diagnosticEngine.getStats().nodeCount > opts.maxNodes) {
      diagnosticEngine.emitMaxNodesExceeded()
      return
    }

    diagnosticEngine.recordDepth(depth)
    diagnosticEngine.emitDepthWarning(depth)

    if (observations.length >= opts.maxObservations) {
      diagnosticEngine.emitMaxObservationsExceeded()
      return
    }

    // Check if we should emit this value
    if (shouldEmit(value)) {
      // Get the current rowKey from contextManager
      const rowKey = contextManager.getRowKey()
      const observation = emitObservation(path, value, rowKey, scopeKeys)
      observations.push(observation)
      diagnosticEngine.recordObservation(observation)
      // Don't recurse into emitted values
      return
    }

    // Recurse based on type
    if (Array.isArray(value)) {
      // Array of objects or mixed: iterate with rowKey tracking
      // Get the path to the array (before the index) to compute arrayKey
      const arrayPath = path // Current path is the path to the array itself
      const arrayKey = toVariableKey(arrayPath) // e.g., "trials[*]" or "trials[*].responses[*]"

      value.forEach((item, index) => {
        // Push rowKey frame for this array instance
        contextManager.push({ arrayKey, index })

        const itemPath = Path.index(path, index)
        walkRecursive(item, itemPath, depth + 1)

        // Pop rowKey frame when leaving this array element
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

  return {
    observations,
  }
}
