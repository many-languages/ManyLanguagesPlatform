const KEYWORD_TOKENS = new Set(["and", "or", "not", "true", "false"])

export function extractRequiredVariableNames(template: string): string[] {
  const names = new Set<string>()

  const varRegex = /var:([a-zA-Z0-9_\.]+)/g
  const statRegex = /stat:([a-zA-Z0-9_\.]+)\./g
  const whereRegex = /\|\s*where:\s*([^}]+)\}\}/g

  let match
  while ((match = varRegex.exec(template)) !== null) {
    names.add(match[1])
  }

  while ((match = statRegex.exec(template)) !== null) {
    names.add(match[1])
  }

  while ((match = whereRegex.exec(template)) !== null) {
    const clause = match[1]
    const fieldRegex = /\b([a-zA-Z0-9_\.]+)\b/g
    let fieldMatch
    while ((fieldMatch = fieldRegex.exec(clause)) !== null) {
      const fieldName = fieldMatch[1]
      if (KEYWORD_TOKENS.has(fieldName) || /^[0-9]+(\.[0-9]+)?$/.test(fieldName)) {
        continue
      }
      names.add(fieldName)
    }
  }

  return Array.from(names)
}

export function buildRequiredKeysHash(names: string[]): string {
  const sorted = [...names].sort()
  return sorted.length > 0 ? sorted.join("|") : "none"
}
