import { describe, expect, it } from "vitest"
import { loginUrlWithNext } from "./loginUrl"
import { safeRedirectPath } from "./safeRedirectPath"

describe("loginUrlWithNext", () => {
  it("carries the requested internal path to login", () => {
    expect(loginUrlWithNext("/admin/invitations")).toBe("/login?next=%2Fadmin%2Finvitations")
    expect(loginUrlWithNext("/studies/12/setup/step1")).toBe(
      "/login?next=%2Fstudies%2F12%2Fsetup%2Fstep1"
    )
  })

  it("keeps the query string, encoded so it survives as one value", () => {
    expect(loginUrlWithNext("/studies?page=2&view=mine")).toBe(
      "/login?next=%2Fstudies%3Fpage%3D2%26view%3Dmine"
    )
  })

  it("round-trips through safeRedirectPath exactly as LoginForm reads it", () => {
    const requested = "/admin-invite/accept?token=abc_DEF-123"
    const url = new URL(loginUrlWithNext(requested), "http://localhost")
    expect(safeRedirectPath(url.searchParams.get("next"))).toBe(requested)
  })

  it("falls back to plain /login when there is nothing safe to return to", () => {
    expect(loginUrlWithNext(null)).toBe("/login")
    expect(loginUrlWithNext(undefined)).toBe("/login")
    expect(loginUrlWithNext("")).toBe("/login")
    expect(loginUrlWithNext("https://evil.com")).toBe("/login")
    expect(loginUrlWithNext("//evil.com")).toBe("/login")
  })
})
