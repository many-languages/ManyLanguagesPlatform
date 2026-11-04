import { describe, expect, it } from "vitest"
import { isStudyPi } from "./studyPermissions"

const study = {
  researchers: [
    { userId: 1, role: "PI" },
    { userId: 2, role: "COLLABORATOR" },
  ],
}

describe("isStudyPi", () => {
  it("is true for the PI", () => {
    expect(isStudyPi(study, 1)).toBe(true)
  })

  it("is false for other researchers on the study", () => {
    expect(isStudyPi(study, 2)).toBe(false)
  })

  it("is false for users not on the study", () => {
    expect(isStudyPi(study, 3)).toBe(false)
  })

  it("is false without a user id", () => {
    expect(isStudyPi(study, null)).toBe(false)
    expect(isStudyPi(study, undefined)).toBe(false)
  })
})
