/**
 * Build prettified variable names from keyPaths, ensuring uniqueness
 * Returns a map from variableKey to prettified variableName
 *
 * Example:
 * - ["Quality", "*", "easy to use"] -> "easy to use"
 * - ["Usability", "*", "easy to use"] -> "Usability: easy to use" (disambiguated)
 */
export function buildVariableNames(variableKeyPaths: Map<string, string[]>): Map<string, string> {
  const result = new Map<string, string>()

  const variableSegments = new Map<string, string[]>()
  for (const [variableKey, keyPath] of variableKeyPaths.entries()) {
    variableSegments.set(
      variableKey,
      keyPath.filter((seg) => seg !== "*")
    )
  }
  if (variableSegments.size === 0) return result

  const lengths = Array.from(variableSegments.values()).map((s) => s.length)
  const maxLength = Math.max(1, ...lengths)

  // labelCounts[k] = count labels formed from last k segments
  const labelCounts = new Map<number, Map<string, number>>()
  for (let k = 1; k <= maxLength; k++) {
    const counts = new Map<string, number>()
    for (const segments of variableSegments.values()) {
      if (segments.length >= k) {
        const label = segments.slice(segments.length - k).join(" › ")
        counts.set(label, (counts.get(label) ?? 0) + 1)
      }
    }
    labelCounts.set(k, counts)
  }

  for (const [variableKey, segments] of variableSegments.entries()) {
    if (segments.length === 0) {
      const fallback = variableKey.startsWith("$") ? variableKey.slice(1) : variableKey
      result.set(variableKey, fallback)
      continue
    }

    let k = 1
    let label = segments.slice(segments.length - k).join(" › ")

    while (k < segments.length) {
      const counts = labelCounts.get(k)!
      if ((counts.get(label) ?? 0) === 1) break
      k++
      label = segments.slice(segments.length - k).join(" › ")
    }

    result.set(variableKey, label)
  }

  return result
}
