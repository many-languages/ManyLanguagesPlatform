import { describe, expect, it } from "vitest"
import { getCodebookValidationAlerts } from "./codebookValidation"

describe("getCodebookValidationAlerts", () => {
  it("returns invalid keys alert when status is INVALID and keys are present", () => {
    const alerts = getCodebookValidationAlerts({
      codebook: {
        status: "INVALID",
        missingKeys: ["a", "b"],
        extraKeys: ["c"],
      },
      approvedExtractionId: null,
      approvedExtractionApprovedAt: null,
    })

    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      kind: "invalidKeys",
      variant: "warning",
      missingKeys: ["a", "b"],
      extraKeys: ["c"],
    })
  })

  it("omits invalid keys alert when INVALID but no key lists", () => {
    const alerts = getCodebookValidationAlerts({
      codebook: { status: "INVALID", missingKeys: [], extraKeys: [] },
      approvedExtractionId: null,
      approvedExtractionApprovedAt: null,
    })

    expect(alerts).toHaveLength(0)
  })

  it("returns soft warning when codebook predates approved extraction", () => {
    const alerts = getCodebookValidationAlerts({
      codebook: {
        status: "VALID",
        updatedAt: new Date("2024-01-01"),
      },
      approvedExtractionId: 1,
      approvedExtractionApprovedAt: new Date("2024-06-01"),
    })

    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ kind: "softWarning", variant: "info" })
  })

  it("does not show soft warning when status is INVALID", () => {
    const alerts = getCodebookValidationAlerts({
      codebook: {
        status: "INVALID",
        missingKeys: ["x"],
        extraKeys: [],
        updatedAt: new Date("2024-01-01"),
      },
      approvedExtractionId: 1,
      approvedExtractionApprovedAt: new Date("2024-06-01"),
    })

    expect(alerts.map((a) => a.kind)).toEqual(["invalidKeys"])
  })

  it("normalizes non-array missingKeys and extraKeys", () => {
    const alerts = getCodebookValidationAlerts({
      codebook: {
        status: "INVALID",
        missingKeys: null,
        extraKeys: undefined,
      },
      approvedExtractionId: null,
      approvedExtractionApprovedAt: null,
    })

    expect(alerts).toHaveLength(0)
  })
})
