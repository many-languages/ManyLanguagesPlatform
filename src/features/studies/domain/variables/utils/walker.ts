import type { ExtractionObservation, ExtractionConfig, ScopeKeys } from "../types"
import type { JsonPath } from "./path"
import { Path } from "./path"
import { toSourcePath, toVariableKey } from "./path"
import { RowKeyTracker } from "./RowKeyTracker"
import { RunFactsCollector } from "./runFactsCollector"
import { StatsTracker } from "./statsTracker"
import { shouldEmit } from "./extractionPolicy"
import { emitObservation, computeScopeKeyId } from "./observationEmitter"
import { VariableFactsCollector } from "./variableFactsCollector"

/**
 * Emission environment - bundles all context needed for observation emission
 */
type EmitEnv = {
  ctx: PipelineContext
  scopeKeys: ScopeKeys
  rowKeyTracker: RowKeyTracker
  observations: ExtractionObservation[]
}

/**
 * Pipeline context - bundles all extraction state and engines
 * Ensures consistency: all engines use the same config
 */
export interface PipelineContext {
  config: ExtractionConfig
  stats: StatsTracker
  run: RunFactsCollector
  variable: VariableFactsCollector
  allowVariableKeys?: Set<string>
}

/**
 * Try to emit an observation - handles all emission logic in one place
 * Returns "stop" if emission happened (don't recurse), "continue" if should recurse
 */
function tryEmitObservation(value: any, path: JsonPath, env: EmitEnv): "continue" | "stop" {
  // Policy check: should we emit this value?
  if (!shouldEmit(value)) {
    return "continue"
  }

  // Allowlist check: only emit observations for requested variable keys
  if (env.ctx.allowVariableKeys && !env.ctx.allowVariableKeys.has(toVariableKey(path))) {
    return "stop"
  }

  // Limit check: max observations guard (only checked when about to emit)
  const nextObsCount = env.ctx.stats.getObservationCount() + 1
  if (nextObsCount > env.ctx.config.walker.maxObservations) {
    env.ctx.run.recordMaxObservationsExceeded({
      threshold: env.ctx.config.walker.maxObservations,
      observationCount: nextObsCount - 1, // Report the count we stopped at (before the would-be exceed)
    })
    return "stop"
  }

  // Emit observation - copy rowKey snapshot (readonly reference must be copied)
  const rowKey = [...env.rowKeyTracker.rowKey]
  const scopeKeyId = computeScopeKeyId(env.scopeKeys)
  const observation = emitObservation(
    path,
    value,
    rowKey,
    env.scopeKeys,
    scopeKeyId,
    env.ctx.config.variable.maxDistinctTracking
  )

  // Record observation
  env.observations.push(observation)
  env.ctx.stats.recordObservationCount()
  env.ctx.variable.record(observation)

  return "stop"
}

/**
 * Walker - deterministic DFS traversal of JSON data
 * Extracts observations with full provenance and context tracking
 * Stats are tracked directly via StatsTracker
 */
export function walk(
  data: any,
  scopeKeys: ScopeKeys,
  ctx: PipelineContext
): { observations: ExtractionObservation[] } {
  const rowKeyTracker = new RowKeyTracker()
  const observations: ExtractionObservation[] = []

  const env: EmitEnv = {
    ctx,
    scopeKeys,
    rowKeyTracker,
    observations,
  }

  // Recursive walk function
  function walkRecursive(value: any, path: JsonPath, depth: number): void {
    // Check guardrails
    if (depth > ctx.config.walker.maxDepth) {
      ctx.run.recordMaxDepthExceeded(depth, ctx.config.walker.maxDepth)
      return
    }

    ctx.stats.recordNodeCount()
    if (ctx.stats.getNodeCount() > ctx.config.walker.maxNodes) {
      ctx.run.recordMaxNodesExceeded({
        nodeCount: ctx.stats.getNodeCount(),
        threshold: ctx.config.walker.maxNodes,
      })
      return
    }

    ctx.stats.recordDepth(depth)
    ctx.run.recordDepthWarning(depth)

    // Try to emit - if emitted, stop recursion
    if (tryEmitObservation(value, path, env) === "stop") {
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
        rowKeyTracker.push({ arrayKey, index })

        const itemPath = Path.index(path, index)
        walkRecursive(item, itemPath, depth + 1)

        // Pop rowKey frame when leaving this array element
        rowKeyTracker.pop()
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
      ctx.run.recordSkippedNonJsonType(pathString, jsType)
    }
    // Primitives are already handled by shouldEmit
  }

  // Start walking from root
  walkRecursive(data, Path.root(), 0)

  return {
    observations,
  }
}
