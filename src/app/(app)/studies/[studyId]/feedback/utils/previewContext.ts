import type { ExtractionBundle } from "../../variables/types"
import type { SerializedExtractionBundle } from "../../setup/utils/serializeExtractionBundle"

export type Primitive = string | number | boolean | null

export type PreviewRenderContext = {
  vars: Record<string, Primitive[]>
  numericSeries: Record<string, number[]>
  rows: Record<string, Record<string, Primitive>>
}

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

export function buildPreviewContextFromBundle(
  bundle: ExtractionBundle | SerializedExtractionBundle,
  requiredVariableNames: string[]
): PreviewRenderContext {
  const requiredSet = new Set(requiredVariableNames)
  const variableKeyToName = new Map(bundle.variables.map((v) => [v.variableKey, v.variableName]))

  const vars: Record<string, Primitive[]> = {}
  const numericSeries: Record<string, number[]> = {}
  const rows: Record<string, Record<string, Primitive>> = {}

  for (const obs of bundle.observations) {
    const variableName = variableKeyToName.get(obs.variableKey)
    if (!variableName || !requiredSet.has(variableName)) continue

    const value = parseValueJson(obs.valueJson)
    if (!vars[variableName]) vars[variableName] = []
    vars[variableName].push(value)

    if (!rows[obs.rowKeyId]) rows[obs.rowKeyId] = {}
    rows[obs.rowKeyId]![variableName] = value

    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : null
    if (numeric !== null && !Number.isNaN(numeric)) {
      if (!numericSeries[variableName]) numericSeries[variableName] = []
      numericSeries[variableName]!.push(numeric)
    }
  }

  return { vars, numericSeries, rows }
}
