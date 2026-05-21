import { describe, expect, it } from "vitest"
import { safeRedirectPath } from "./safeRedirectPath"

describe("safeRedirectPath", () => {
  it("accepts same-origin relative paths", () => {
    expect(safeRedirectPath("/studies")).toBe("/studies")
    expect(safeRedirectPath("/studies/1/setup/step1")).toBe("/studies/1/setup/step1")
  })

  it("rejects missing, external, and protocol-relative targets", () => {
    expect(safeRedirectPath(null)).toBeNull()
    expect(safeRedirectPath(undefined)).toBeNull()
    expect(safeRedirectPath("")).toBeNull()
    expect(safeRedirectPath("//evil.com")).toBeNull()
    expect(safeRedirectPath("https://evil.com")).toBeNull()
    expect(safeRedirectPath("javascript:alert(1)")).toBeNull()
  })
})
