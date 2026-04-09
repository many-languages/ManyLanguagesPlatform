import { extractRequiredVariableNames } from "./requiredVariableNames"

/**
 * Names from the template body and optional stored keys that are marked personal data
 * in the codebook. Used for server-side enforcement only; client DSL stays separate.
 */
export function collectPersonalDataViolationsForFeedbackTemplate(
  templateContent: string,
  personalDataVariableNames: Set<string>,
  requiredVariableNames?: string[]
): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  const push = (name: string) => {
    if (personalDataVariableNames.has(name) && !seen.has(name)) {
      seen.add(name)
      out.push(name)
    }
  }

  for (const name of extractRequiredVariableNames(templateContent)) {
    push(name)
  }
  for (const name of requiredVariableNames ?? []) {
    push(name)
  }

  return out
}
