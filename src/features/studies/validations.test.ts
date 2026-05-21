import { describe, expect, it } from "vitest"
import { StudyInformationFormSchema, UpdateStudy } from "./validations"

describe("StudyInformationFormSchema date range", () => {
  const validFields = {
    title: "Study",
    description: "Description",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    sampleSize: 10,
    payment: "10 EUR",
    length: "30 min",
  }

  it("accepts end date on start date", () => {
    expect(
      StudyInformationFormSchema.safeParse({
        ...validFields,
        startDate: "2026-06-01",
        endDate: "2026-06-01",
      }).success
    ).toBe(true)
  })

  it("rejects end date before start date", () => {
    const result = StudyInformationFormSchema.safeParse({
      ...validFields,
      startDate: "2026-06-30",
      endDate: "2026-06-01",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors.some((e) => e.path.includes("endDate"))).toBe(true)
    }
  })
})

describe("UpdateStudy date range", () => {
  it("rejects end date before start date", () => {
    const result = UpdateStudy.safeParse({
      id: 1,
      title: "Study",
      description: "Description",
      startDate: "2026-12-01",
      endDate: "2026-01-01",
      sampleSize: 10,
      payment: "10 EUR",
      length: "30 min",
    })
    expect(result.success).toBe(false)
  })
})
