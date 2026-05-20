import { describe, expect, it } from "vitest"
import {
  CODEBOOK_MISSING_DESCRIPTIONS_TOOLTIP,
  CODEBOOK_MISSING_VARIABLES_TOOLTIP,
  getCodebookStepState,
} from "./codebookStep"

describe("getCodebookStepState", () => {
  const archived = "Archived study"

  it("disables next when there are no variables", () => {
    expect(
      getCodebookStepState({
        canEditSetup: true,
        variableCount: 0,
        hasMissingDescriptions: false,
        archivedStudyMessage: archived,
      })
    ).toEqual({
      disableNext: true,
      nextTooltip: CODEBOOK_MISSING_VARIABLES_TOOLTIP,
    })
  })

  it("disables next when descriptions are missing", () => {
    expect(
      getCodebookStepState({
        canEditSetup: true,
        variableCount: 3,
        hasMissingDescriptions: true,
        archivedStudyMessage: archived,
      })
    ).toEqual({
      disableNext: true,
      nextTooltip: CODEBOOK_MISSING_DESCRIPTIONS_TOOLTIP,
    })
  })

  it("disables next with archived message when setup is locked", () => {
    expect(
      getCodebookStepState({
        canEditSetup: false,
        variableCount: 3,
        hasMissingDescriptions: false,
        archivedStudyMessage: archived,
      })
    ).toEqual({ disableNext: true, nextTooltip: archived })
  })

  it("enables next when ready", () => {
    expect(
      getCodebookStepState({
        canEditSetup: true,
        variableCount: 2,
        hasMissingDescriptions: false,
        archivedStudyMessage: archived,
      })
    ).toEqual({ disableNext: false, nextTooltip: undefined })
  })
})
