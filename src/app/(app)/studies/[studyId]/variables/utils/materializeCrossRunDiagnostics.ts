import type {
  ComponentFacts,
  CrossRunDiagnostics,
  Diagnostic,
  RunFacts,
  ValueType,
  VariableFacts,
} from "../types"

function getNonNullTypes(
  typeMap?: Map<ValueType, { count: number; examplePaths: string[] }>
): string[] {
  if (!typeMap) return []
  return Array.from(typeMap.entries())
    .filter(([t, data]) => t !== "null" && data.count > 0)
    .map(([t]) => t)
    .sort()
}

export function materializeCrossRunDiagnostics(args: {
  runFactsByRun: Map<number, RunFacts>
  componentFactsByRun: Map<number, ComponentFacts>
  variableFactsByRun: Map<number, VariableFacts>
}): CrossRunDiagnostics | null {
  const runIds = Array.from(args.runFactsByRun.keys())
  const runCount = runIds.length
  if (runCount <= 1) return null

  const runDiagnostics: Diagnostic[] = []
  const componentDiagnostics = new Map<number, Diagnostic[]>()
  const variableDiagnostics = new Map<string, Diagnostic[]>()

  const runsWithLimits: number[] = []
  for (const [runId, facts] of args.runFactsByRun.entries()) {
    if (facts.limits.size > 0) runsWithLimits.push(runId)
  }
  if (runsWithLimits.length > 0 && runsWithLimits.length < runCount) {
    runDiagnostics.push({
      severity: "warning",
      code: "CROSS_RUN_TRUNCATED_EXTRACTION",
      message: `Extraction was truncated in ${runsWithLimits.length}/${runCount} runs`,
      metadata: {
        runCount,
        presentRunCount: runsWithLimits.length,
        missingRunCount: runCount - runsWithLimits.length,
        runIds: runsWithLimits,
      },
    })
  }

  const componentPresence = new Map<number, Set<number>>()
  const componentFormats = new Map<number, Map<string, number[]>>()
  for (const [runId, facts] of args.componentFactsByRun.entries()) {
    for (const [componentId, entry] of facts.entries()) {
      let presentRuns = componentPresence.get(componentId)
      if (!presentRuns) {
        presentRuns = new Set<number>()
        componentPresence.set(componentId, presentRuns)
      }
      presentRuns.add(runId)

      if (entry.detectedFormat) {
        let formatRuns = componentFormats.get(componentId)
        if (!formatRuns) {
          formatRuns = new Map()
          componentFormats.set(componentId, formatRuns)
        }
        let runsForFormat = formatRuns.get(entry.detectedFormat)
        if (!runsForFormat) {
          runsForFormat = []
          formatRuns.set(entry.detectedFormat, runsForFormat)
        }
        runsForFormat.push(runId)
      }
    }
  }

  for (const [componentId, presentRuns] of componentPresence.entries()) {
    if (presentRuns.size < runCount) {
      const missingRunIds = runIds.filter((id) => !presentRuns.has(id))
      componentDiagnostics.set(componentId, [
        {
          severity: "warning",
          code: "CROSS_RUN_COMPONENT_MISSING",
          message: `Component ${componentId} is missing in ${missingRunIds.length}/${runCount} runs`,
          metadata: {
            componentId,
            runCount,
            presentRunCount: presentRuns.size,
            missingRunCount: missingRunIds.length,
            missingRunIds,
          },
        },
      ])
    }

    const formatRuns = componentFormats.get(componentId)
    if (formatRuns && formatRuns.size > 1) {
      const formats = Array.from(formatRuns.keys())
      const existing = componentDiagnostics.get(componentId) ?? []
      existing.push({
        severity: "warning",
        code: "CROSS_RUN_COMPONENT_FORMAT_MISMATCH",
        message: `Component ${componentId} has multiple formats across runs: ${formats.join(", ")}`,
        metadata: {
          componentId,
          runCount,
          formats,
        },
      })
      componentDiagnostics.set(componentId, existing)
    }
  }

  const variablePresence = new Map<string, Set<number>>()
  const variableTypesByRun = new Map<string, Map<number, string[]>>()
  const variableNullRates = new Map<string, Map<number, number>>()

  for (const [runId, facts] of args.variableFactsByRun.entries()) {
    for (const [variableKey, totalCount] of facts.counts.variableCounts.entries()) {
      if (totalCount <= 0) continue

      let presentRuns = variablePresence.get(variableKey)
      if (!presentRuns) {
        presentRuns = new Set<number>()
        variablePresence.set(variableKey, presentRuns)
      }
      presentRuns.add(runId)

      const typeMap = facts.types.variableTypes.get(variableKey)
      const types = getNonNullTypes(typeMap)
      let typesByRun = variableTypesByRun.get(variableKey)
      if (!typesByRun) {
        typesByRun = new Map()
        variableTypesByRun.set(variableKey, typesByRun)
      }
      typesByRun.set(runId, types)

      const nullCount = facts.counts.variableNullCounts.get(variableKey) || 0
      const nullRate = totalCount > 0 ? nullCount / totalCount : 0
      let nullRatesByRun = variableNullRates.get(variableKey)
      if (!nullRatesByRun) {
        nullRatesByRun = new Map()
        variableNullRates.set(variableKey, nullRatesByRun)
      }
      nullRatesByRun.set(runId, nullRate)
    }
  }

  for (const [variableKey, presentRuns] of variablePresence.entries()) {
    const diags: Diagnostic[] = []
    if (presentRuns.size < runCount) {
      const missingRunIds = runIds.filter((id) => !presentRuns.has(id))
      diags.push({
        severity: "warning",
        code: "CROSS_RUN_VARIABLE_MISSING",
        message: `Variable '${variableKey}' is missing in ${missingRunIds.length}/${runCount} runs`,
        metadata: {
          variable: variableKey,
          runCount,
          presentRunCount: presentRuns.size,
          missingRunCount: missingRunIds.length,
          missingRunIds,
        },
      })
    }

    const typesByRun = variableTypesByRun.get(variableKey)
    if (typesByRun && typesByRun.size > 1) {
      const typeSignature = new Set(Array.from(typesByRun.values()).map((types) => types.join("|")))
      if (typeSignature.size > 1) {
        const typesByRunRecord: Record<string, string[]> = {}
        for (const [runId, types] of typesByRun.entries()) {
          typesByRunRecord[String(runId)] = types
        }
        diags.push({
          severity: "warning",
          code: "CROSS_RUN_VARIABLE_TYPE_DRIFT",
          message: `Variable '${variableKey}' has different types across runs`,
          metadata: {
            variable: variableKey,
            runCount,
            typesByRun: typesByRunRecord,
          },
        })
      }
    }

    const nullRatesByRun = variableNullRates.get(variableKey)
    if (nullRatesByRun && nullRatesByRun.size > 1) {
      let hasAllNull = false
      let hasNonNull = false
      for (const rate of nullRatesByRun.values()) {
        if (rate >= 1) hasAllNull = true
        else hasNonNull = true
      }
      if (hasAllNull && hasNonNull) {
        const nullRatesRecord: Record<string, number> = {}
        for (const [runId, rate] of nullRatesByRun.entries()) {
          nullRatesRecord[String(runId)] = rate
        }
        diags.push({
          severity: "warning",
          code: "CROSS_RUN_VARIABLE_NULL_ONLY",
          message: `Variable '${variableKey}' is all null in some runs and non-null in others`,
          metadata: {
            variable: variableKey,
            runCount,
            nullRatesByRun: nullRatesRecord,
          },
        })
      }
    }

    if (diags.length > 0) {
      variableDiagnostics.set(variableKey, diags)
    }
  }

  return {
    run: runDiagnostics,
    component: componentDiagnostics,
    variable: variableDiagnostics,
  }
}
