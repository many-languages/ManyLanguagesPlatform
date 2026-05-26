import type { FeedbackRenderBundleInput, FeedbackRenderContext, Primitive } from "./renderTypes"

function parseValueJson(valueJson: string): Primitive {
  try {
    const parsed = JSON.parse(valueJson)
    if (
      parsed === null ||
      typeof parsed === "string" ||
      typeof parsed === "number" ||
      typeof parsed === "boolean"
    ) {
      return parsed
    }
    return valueJson
  } catch {
    return valueJson
  }
}

export function buildFeedbackRenderContext(
  bundle: FeedbackRenderBundleInput,
  requiredDslKeys: string[]
): FeedbackRenderContext {
  const requiredSet = new Set(requiredDslKeys)
  const aliasesByDslKey = new Map<string, string[]>()
  for (const requiredKey of requiredDslKeys) {
    if (requiredKey.startsWith(".")) {
      const normalized = requiredKey.replace(/^\.+/, "")
      if (!normalized) continue
      const aliases = aliasesByDslKey.get(normalized) ?? []
      aliases.push(requiredKey)
      aliasesByDslKey.set(normalized, aliases)
    }
  }
  const variableKeyToDslKey = new Map(bundle.variables.map((v) => [v.variableKey, v.dslKey]))

  const vars: Record<string, Primitive[]> = {}
  const numericSeries: Record<string, number[]> = {}
  const rows: Record<string, Record<string, Primitive>> = {}

  for (const obs of bundle.observations) {
    const dslKey = variableKeyToDslKey.get(obs.variableKey)
    if (!dslKey) continue
    const renderKeys = requiredSet.has(dslKey) ? [dslKey] : aliasesByDslKey.get(dslKey) ?? []
    if (renderKeys.length === 0) continue

    const value = parseValueJson(obs.valueJson)
    const rowGroupKey = `${obs.scopeKeyId}::${obs.rowKeyId}`
    if (!rows[rowGroupKey]) rows[rowGroupKey] = {}
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : null

    for (const renderKey of renderKeys) {
      if (!vars[renderKey]) vars[renderKey] = []
      vars[renderKey].push(value)
      rows[rowGroupKey]![renderKey] = value

      if (numeric !== null && !Number.isNaN(numeric)) {
        if (!numericSeries[renderKey]) numericSeries[renderKey] = []
        numericSeries[renderKey]!.push(numeric)
      }
    }
  }

  return { vars, numericSeries, rows }
}

export type { FeedbackRenderBundleInput, FeedbackRenderContext, Primitive } from "./renderTypes"
