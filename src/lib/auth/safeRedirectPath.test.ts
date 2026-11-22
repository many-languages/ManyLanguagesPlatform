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

  it("rejects backslash and control-character tricks that browsers read as `//`", () => {
    expect(safeRedirectPath("/\\evil.com")).toBeNull()
    expect(safeRedirectPath("/\\/evil.com")).toBeNull()
    expect(safeRedirectPath("/\t/evil.com")).toBeNull()
    expect(safeRedirectPath("/\n/evil.com")).toBeNull()
  })

  it("keeps query strings on internal paths", () => {
    expect(safeRedirectPath("/studies?page=2&view=mine")).toBe("/studies?page=2&view=mine")
  })
})
