import { describe, expect, it } from "vitest"
import { collectPersonalDataViolationsForFeedbackTemplate } from "./feedbackTemplatePersonalDataPolicy"

describe("collectPersonalDataViolationsForFeedbackTemplate", () => {
  const pd = new Set(["email", "phone"])

  it("returns empty when no personal-data names appear", () => {
    expect(
      collectPersonalDataViolationsForFeedbackTemplate("{{ var:score }}", pd, ["score"])
    ).toEqual([])
  })

  it("flags var: references to personal data", () => {
    expect(
      collectPersonalDataViolationsForFeedbackTemplate("Hi {{ var:email }}", pd, undefined)
    ).toEqual(["email"])
  })

  it("flags stat: references to personal data", () => {
    expect(
      collectPersonalDataViolationsForFeedbackTemplate("{{ stat:phone.avg:within }}", pd, undefined)
    ).toEqual(["phone"])
  })

  it("flags requiredVariableNames that list personal data even if not in extractors path", () => {
    expect(collectPersonalDataViolationsForFeedbackTemplate("plain text", pd, ["email"])).toEqual([
      "email",
    ])
  })

  it("dedupes repeated violations", () => {
    expect(
      collectPersonalDataViolationsForFeedbackTemplate(
        "{{ var:email }} and {{ stat:email.avg:within }}",
        pd,
        ["email"]
      )
    ).toEqual(["email"])
  })
})
