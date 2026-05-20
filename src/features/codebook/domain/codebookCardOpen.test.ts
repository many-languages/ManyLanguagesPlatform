import { describe, expect, it } from "vitest"

import { codebookCardDefaultOpen, codebookCardHasDescription } from "./codebookCardOpen"

describe("codebookCardDefaultOpen", () => {
  it("opens when description is empty or whitespace", () => {
    expect(codebookCardDefaultOpen("")).toBe(true)
    expect(codebookCardDefaultOpen("   ")).toBe(true)
    expect(codebookCardDefaultOpen(null)).toBe(true)
    expect(codebookCardDefaultOpen(undefined)).toBe(true)
  })

  it("closes when description has content", () => {
    expect(codebookCardDefaultOpen("Measures reaction time")).toBe(false)
  })
})

describe("codebookCardHasDescription", () => {
  it("is false when description is empty", () => {
    expect(codebookCardHasDescription("")).toBe(false)
    expect(codebookCardHasDescription(null)).toBe(false)
  })

  it("is true when description has content", () => {
    expect(codebookCardHasDescription("Measures reaction time")).toBe(true)
  })
})
