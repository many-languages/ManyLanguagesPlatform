/**
 * Converts a variableKey (wildcarded JSON path with $ prefix) to a DSL-safe token
 * suitable for use inside {{ var:... }} and {{ stat:... }} template placeholders.
 *
 * Rules:
 *   - Strip the leading "$"
 *   - Drop "[*]" array wildcards (array vars are aggregated via stat:, not var:)
 *   - Sanitize quoted-key segments like ["my.key"] by replacing chars outside
 *     [a-zA-Z0-9_] with "_"
 *
 * The result only contains [a-zA-Z0-9_.] and is therefore always valid for the
 * IDENT regex in feedbackDslPatterns.ts.
 *
 * Examples:
 *   $score                              → score
 *   $frameworksRate.angularv1.knowledge → frameworksRate.angularv1.knowledge
 *   $trials[*].rt                       → trials.rt
 *   $[*].score                          → score
 *   $["my.key"].value                   → my_key.value
 */
export function variableKeyToDslToken(variableKey: string): string {
  return (
    variableKey
      .replace(/^\$/, "") // strip root $
      .replace(/\[\*\]\./g, ".") // [*]. → .
      .replace(/\[\*\]$/, "") // trailing [*]
      // quoted key mid-path (["key"].next): replace with sanitized.next
      .replace(/\["([^"]+)"\]\./g, (_, k: string) => k.replace(/[^a-zA-Z0-9_]/g, "_") + ".")
      // quoted key at end-of-path (["key"]): prefix with "." unless it is the very first token
      .replace(/(.)?\["([^"]+)"\]$/, (_, prev: string | undefined, k: string) => {
        const safe = k.replace(/[^a-zA-Z0-9_]/g, "_")
        return prev !== undefined ? prev + "." + safe : safe
      })
      // root-level [*] leaves a leading dot (e.g. $[*].score → .score)
      .replace(/^\.+/, "")
  )
}
