import type { CodebookStepState } from "../types"

export const CODEBOOK_MISSING_VARIABLES_TOOLTIP =
  "No variables were extracted. Go back to Step 4 and rerun extraction."

export const CODEBOOK_MISSING_DESCRIPTIONS_TOOLTIP = "Please add descriptions for all variables"

export function getCodebookStepState(params: {
  canEditSetup: boolean
  variableCount: number
  hasMissingDescriptions: boolean
  archivedStudyMessage: string
}): CodebookStepState {
  const { canEditSetup, variableCount, hasMissingDescriptions, archivedStudyMessage } = params

  const disableNext = variableCount === 0 || hasMissingDescriptions || !canEditSetup
  const nextTooltip = !canEditSetup
    ? archivedStudyMessage
    : variableCount === 0
    ? CODEBOOK_MISSING_VARIABLES_TOOLTIP
    : hasMissingDescriptions
    ? CODEBOOK_MISSING_DESCRIPTIONS_TOOLTIP
    : undefined

  return { disableNext, nextTooltip }
}
