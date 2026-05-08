import { describe, expect, it } from "vitest"
import {
  createFeedbackStatPlaceholderRegex,
  createVarPlaceholderRegex,
  extractFieldNamesFromWhereClause,
} from "./feedbackDslPatterns"
import { extractRequiredVariableNames } from "./requiredVariableNames"

describe("feedbackDslPatterns", () => {
  it("extractFieldNamesFromWhereClause skips keywords and numbers", () => {
    expect(extractFieldNamesFromWhereClause("a == 1 and b > 2")).toEqual(["a", "b"])
  })

  it("extractRequiredVariableNames uses var + stat + where fields", () => {
    const t = `
      {{ var:score:first | where: group in [1,2] }}
      {{ stat:latency.avg:across | where: region == "eu" }}
    `
    const names = extractRequiredVariableNames(t)
    expect(names).toContain("score")
    expect(names).toContain("group")
    expect(names).toContain("latency")
    expect(names).toContain("region")
  })

  it("var and stat regex factories are safe to exec-loop (fresh g regex)", () => {
    const s = "{{ var:x }} {{ stat:y.count }}"
    const v = createVarPlaceholderRegex()
    expect(v.exec(s)?.[1]).toBe("x")
    const st = createFeedbackStatPlaceholderRegex()
    expect(st.exec(s)?.[1]).toBe("y")
  })
})
