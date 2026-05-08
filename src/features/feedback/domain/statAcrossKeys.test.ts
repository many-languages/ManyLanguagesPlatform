import { describe, expect, it } from "vitest"
import { templateUsesStatAcross } from "./statAcrossKeys"

describe("templateUsesStatAcross", () => {
  it("returns false when no stat placeholders", () => {
    expect(templateUsesStatAcross("Hello {{ var:foo }}")).toBe(false)
  })

  it("returns false for stat:within only", () => {
    expect(templateUsesStatAcross("{{ stat:rt.avg:within }}")).toBe(false)
  })

  it("returns true for well-formed stat:…:across", () => {
    expect(templateUsesStatAcross("Mean: {{ stat:rt.avg:across }}")).toBe(true)
  })

  it("returns true for stat:…:across with where clause", () => {
    expect(templateUsesStatAcross("{{ stat:rt.avg:across | where: correct == true }}")).toBe(true)
  })

  it("returns false for malformed text that old substring regex could match", () => {
    expect(templateUsesStatAcross("not a tag: stat:rt.avg:across }}")).toBe(false)
  })
})
