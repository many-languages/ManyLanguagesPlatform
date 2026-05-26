import {
  createBareVarReferenceRegex,
  createBareStatReferenceRegex,
  createConditionalBlockRegex,
  createFeedbackStatPlaceholderRegex,
  createVarPlaceholderRegex,
  extractFieldNamesFromWhereClause,
} from "./feedbackDslPatterns"

export function extractRequiredVariableNames(template: string): string[] {
  const names = new Set<string>()

  const varRe = createVarPlaceholderRegex()
  let vm: RegExpExecArray | null
  while ((vm = varRe.exec(template)) !== null) {
    const varName = vm[1]
    if (varName) names.add(varName)
    const where = vm[3]?.trim()
    if (where) {
      for (const n of extractFieldNamesFromWhereClause(where)) {
        names.add(n)
      }
    }
  }

  const statRe = createFeedbackStatPlaceholderRegex()
  let sm: RegExpExecArray | null
  while ((sm = statRe.exec(template)) !== null) {
    const varName = sm[1]
    if (varName) names.add(varName)
    const where = sm[4]?.trim()
    if (where) {
      for (const n of extractFieldNamesFromWhereClause(where)) {
        names.add(n)
      }
    }
  }

  const conditionalRe = createConditionalBlockRegex()
  let cm: RegExpExecArray | null
  while ((cm = conditionalRe.exec(template)) !== null) {
    const condition = cm[1]
    if (!condition) continue

    const bareVarRe = createBareVarReferenceRegex()
    let bm: RegExpExecArray | null
    while ((bm = bareVarRe.exec(condition)) !== null) {
      const varName = bm[1]
      if (varName) names.add(varName)
    }

    const bareStatRe = createBareStatReferenceRegex()
    let bsm: RegExpExecArray | null
    while ((bsm = bareStatRe.exec(condition)) !== null) {
      const varName = bsm[1]
      if (varName) names.add(varName)
      const where = bsm[3]?.trim()
      if (where) {
        for (const n of extractFieldNamesFromWhereClause(where)) {
          names.add(n)
        }
      }
    }
  }

  return Array.from(names)
}

export function buildRequiredKeysHash(names: string[]): string {
  const sorted = [...names].sort()
  return sorted.length > 0 ? sorted.join("|") : "none"
}
