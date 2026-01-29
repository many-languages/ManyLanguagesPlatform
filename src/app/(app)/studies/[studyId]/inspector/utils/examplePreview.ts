import { ExtractedVariable } from "../../variables/types"
import { tryParseJson } from "./tryParseJson"

export function examplePreview(variable: ExtractedVariable): string {
  const example = variable.examples[0]?.value
  if (!example) return ""
  const parsed = tryParseJson(example)
  if (parsed.ok) {
    // keep it compact for a table cell
    if (typeof parsed.value === "string") return parsed.value
    return JSON.stringify(parsed.value)
  }
  return parsed.raw
}
