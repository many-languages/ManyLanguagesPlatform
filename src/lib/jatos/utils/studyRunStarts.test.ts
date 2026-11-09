import { describe, expect, it } from "vitest"
import {
  extractStudyCodeFromRunUrl,
  getStartedRunStudyCodes,
  hasStartedRun,
} from "./studyRunStarts"

describe("extractStudyCodeFromRunUrl", () => {
  it("reads the code from a run URL", () => {
    expect(extractStudyCodeFromRunUrl("https://jatos.localhost/publix/vsQYWpZyFB6")).toBe(
      "vsQYWpZyFB6"
    )
  })

  it("ignores query strings and trailing slashes", () => {
    expect(extractStudyCodeFromRunUrl("https://jatos.test/publix/abc?participantId=p1")).toBe("abc")
    expect(extractStudyCodeFromRunUrl("https://jatos.test/publix/abc/")).toBe("abc")
  })

  it("returns null for missing or non-run URLs", () => {
    expect(extractStudyCodeFromRunUrl(null)).toBeNull()
    expect(extractStudyCodeFromRunUrl("")).toBeNull()
    expect(extractStudyCodeFromRunUrl("not a url")).toBeNull()
    expect(extractStudyCodeFromRunUrl("https://jatos.test/jatos/api/v1/admin")).toBeNull()
  })
})

describe("getStartedRunStudyCodes", () => {
  it("collects codes from run-start entries only", () => {
    const codes = getStartedRunStudyCodes([
      { msg: "Started study run with Personal Single worker", studyCode: "a" },
      { msg: "Started study run with Personal Multiple worker", studyCode: "b" },
      { msg: "Exported results (files and/or data)", studyCode: "c" },
      { msg: "Started study run with Personal Single worker" },
    ])

    expect([...codes].sort()).toEqual(["a", "b"])
  })
})

describe("hasStartedRun", () => {
  const started = new Set(["abc"])

  it("matches a participant link whose code was started", () => {
    expect(hasStartedRun("https://jatos.test/publix/abc", started)).toBe(true)
  })

  it("is false for other codes and missing links", () => {
    expect(hasStartedRun("https://jatos.test/publix/xyz", started)).toBe(false)
    expect(hasStartedRun(null, started)).toBe(false)
  })
})
