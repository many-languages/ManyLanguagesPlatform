import { Diagnostic, DiagnosticCode, VariableFlag } from "../types"

/**
 * Derive variable flags from diagnostics (projection for quick filtering)
 * Flags are a lightweight projection of diagnostics - extracts DiagnosticCodes that are flags
 */
export function deriveVariableFlags(diagnostics: Diagnostic[]): VariableFlag[] {
  const flags: VariableFlag[] = []
  const seenFlags = new Set<VariableFlag>()

  // Diagnostic codes that map to flags
  const flagCodes: Set<DiagnosticCode> = new Set([
    "TYPE_DRIFT",
    "MANY_NULLS",
    "MIXED_ARRAY_ELEMENT_TYPES",
    "HIGH_OCCURRENCE",
    "HIGH_CARDINALITY",
    "LARGE_VALUES",
    "UNEXPECTED_OBJECT_ARRAY_LEAF",
  ])

  for (const diagnostic of diagnostics) {
    if (flagCodes.has(diagnostic.code)) {
      const flag = diagnostic.code as VariableFlag
      if (!seenFlags.has(flag)) {
        flags.push(flag)
        seenFlags.add(flag)
      }
    }
  }

  return flags
}
