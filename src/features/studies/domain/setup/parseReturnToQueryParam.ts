import { TOTAL_STEPS } from "./constants"

const STEP_RETURN_TO = /^step(\d+)$/

/** Allowlisted `returnTo` for setup step 1 (`study`, `step1`…`stepN`); invalid → default. */
export function parseReturnToQueryParam(
  value: string | null | undefined,
  defaultValue = "step2"
): string {
  if (!value) return defaultValue
  if (value === "study") return value
  const match = STEP_RETURN_TO.exec(value)
  if (match) {
    const stepNum = parseInt(match[1], 10)
    if (stepNum >= 1 && stepNum <= TOTAL_STEPS) return value
  }
  return defaultValue
}
