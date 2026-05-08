export const STEP_KEYS = [
  "step1Completed",
  "step2Completed",
  "step3Completed",
  "step4Completed",
  "step5Completed",
  "step6Completed",
] as const

export const TOTAL_STEPS = STEP_KEYS.length

/** Human-readable names for each setup step (used in admin UI, progress displays, etc.) */
export const STEP_NAMES: Record<number, string> = {
  1: "General info",
  2: "JATOS setup",
  3: "Test run",
  4: "Debug",
  5: "Codebook",
  6: "Feedback",
}
