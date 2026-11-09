import { describe, expect, it } from "vitest"
import type { JatosStudyResult } from "@/src/types/jatos"
import { countNonPilotResponses, hasParticipantResponses } from "./studyHasParticipantResponses"

const result = (studyState: string, comment?: string) =>
  ({ studyState, comment } as unknown as JatosStudyResult)

describe("hasParticipantResponses", () => {
  it("is false without results", () => {
    expect(hasParticipantResponses([])).toBe(false)
  })

  it("counts non-pilot results in any state", () => {
    for (const state of ["FINISHED", "FAIL", "ABORTED", "STARTED", "PRE"]) {
      expect(hasParticipantResponses([result(state, "participant-1")])).toBe(true)
    }
  })

  it("ignores pilot runs in any state", () => {
    expect(
      hasParticipantResponses([result("FINISHED", "pilot: test"), result("FAIL", "pilot: test")])
    ).toBe(false)
  })
})

describe("countNonPilotResponses", () => {
  it("still counts only finished non-pilot results", () => {
    expect(
      countNonPilotResponses([
        result("FINISHED", "participant-1"),
        result("FAIL", "participant-2"),
        result("FINISHED", "pilot: test"),
      ])
    ).toBe(1)
  })
})
