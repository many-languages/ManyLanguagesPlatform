import { describe, expect, it } from "vitest"
import { parseSaveFeedbackTemplateActionInput } from "./validations"

describe("parseSaveFeedbackTemplateActionInput", () => {
  it("accepts create input with trimmed content", () => {
    const result = parseSaveFeedbackTemplateActionInput({
      studyId: 1,
      content: "  Hello {{var}}  ",
    })

    expect(result).toEqual({
      success: true,
      data: { studyId: 1, content: "Hello {{var}}", initialTemplate: undefined },
    })
  })

  it("accepts update input when initialTemplate is present", () => {
    const result = parseSaveFeedbackTemplateActionInput({
      studyId: 1,
      content: "Updated",
      initialTemplate: { id: 5, content: "Old" },
    })

    expect(result).toEqual({
      success: true,
      data: {
        studyId: 1,
        content: "Updated",
        initialTemplate: { id: 5, content: "Old" },
      },
    })
  })

  it("rejects whitespace-only content", () => {
    const result = parseSaveFeedbackTemplateActionInput({
      studyId: 1,
      content: "   ",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/empty/i)
    }
  })

  it("rejects invalid studyId on create", () => {
    const result = parseSaveFeedbackTemplateActionInput({
      studyId: -1,
      content: "Hello",
    })

    expect(result.success).toBe(false)
  })
})
