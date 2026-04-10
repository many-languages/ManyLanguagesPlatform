import type { ExtractionObservation } from "../types"
import {
  buildUniqueDisplayNames,
  compareObservationExportOrder,
  escapeCsvField,
} from "./observationsCsvUtils"

/**
 * Long (narrow) CSV: one row per extracted value.
 * Columns: `study_result_id`, `component_id`, `row_id` (extraction `rowKeyId`),
 * `variable_key`, `variable_name`, `value` (JSON literal from `valueJson`).
 */
export function observationsToLongCsv(
  observations: ExtractionObservation[],
  variableKeyToName: Map<string, string>,
  options?: { includeUtf8Bom?: boolean }
): string {
  const includeBom = options?.includeUtf8Bom ?? true

  const variableKeys = [...variableKeyToName.keys()].sort((a, b) => {
    const na = variableKeyToName.get(a) ?? a
    const nb = variableKeyToName.get(b) ?? b
    return na.localeCompare(nb, undefined, { sensitivity: "base" }) || a.localeCompare(b)
  })

  const displayNameByKey = buildUniqueDisplayNames(variableKeys, variableKeyToName)

  const sorted = [...observations].sort(compareObservationExportOrder)

  const header = [
    "study_result_id",
    "component_id",
    "row_id",
    "variable_key",
    "variable_name",
    "value",
  ]
    .map(escapeCsvField)
    .join(",")

  const lines: string[] = [header]

  for (const obs of sorted) {
    const studyResultId = String(obs.scopeKeys.studyResultId ?? "")
    const row = [
      escapeCsvField(studyResultId),
      escapeCsvField(String(obs.scopeKeys.componentId)),
      escapeCsvField(obs.rowKeyId),
      escapeCsvField(obs.variableKey),
      escapeCsvField(displayNameByKey.get(obs.variableKey) ?? obs.variableKey),
      escapeCsvField(obs.valueJson),
    ]
    lines.push(row.join(","))
  }

  const body = lines.join("\r\n")
  return includeBom ? `\uFEFF${body}` : body
}
