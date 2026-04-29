import { describe, it, expect } from "vitest"
import { canEditStudySetup, studyArchivedBlocksSetupWrite } from "./studyEditability"

describe("studyArchivedBlocksSetupWrite", () => {
  it("is true only when archived is strictly true", () => {
    expect(studyArchivedBlocksSetupWrite({ archived: true })).toBe(true)
    expect(studyArchivedBlocksSetupWrite({ archived: false })).toBe(false)
    expect(studyArchivedBlocksSetupWrite({ archived: null })).toBe(false)
    expect(studyArchivedBlocksSetupWrite({})).toBe(false)
  })
})

describe("canEditStudySetup", () => {
  it("is the negation of studyArchivedBlocksSetupWrite", () => {
    expect(canEditStudySetup({ archived: true })).toBe(false)
    expect(canEditStudySetup({ archived: false })).toBe(true)
    expect(canEditStudySetup({ archived: null })).toBe(true)
    expect(canEditStudySetup({})).toBe(true)
  })
})
