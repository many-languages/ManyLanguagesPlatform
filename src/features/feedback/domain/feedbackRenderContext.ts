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
  const variableKeyToDslKey = new Map(bundle.variables.map((v) => [v.variableKey, v.dslKey]))

  const vars: Record<string, Primitive[]> = {}
  const numericSeries: Record<string, number[]> = {}
  const rows: Record<string, Record<string, Primitive>> = {}

  for (const obs of bundle.observations) {
    const dslKey = variableKeyToDslKey.get(obs.variableKey)
    if (!dslKey || !requiredSet.has(dslKey)) continue

    const value = parseValueJson(obs.valueJson)
    if (!vars[dslKey]) vars[dslKey] = []
    vars[dslKey].push(value)

    const rowGroupKey = `${obs.scopeKeyId}::${obs.rowKeyId}`
    if (!rows[rowGroupKey]) rows[rowGroupKey] = {}
    rows[rowGroupKey]![dslKey] = value

    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : null
    if (numeric !== null && !Number.isNaN(numeric)) {
      if (!numericSeries[dslKey]) numericSeries[dslKey] = []
      numericSeries[dslKey]!.push(numeric)
    }
  }

  return { vars, numericSeries, rows }
}

export type { FeedbackRenderBundleInput, FeedbackRenderContext, Primitive } from "./renderTypes"
