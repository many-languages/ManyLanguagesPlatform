import { describe, expect, it } from "vitest"
import { adminInvitePath } from "./constants"

describe("adminInvitePath", () => {
  it("sends existing accounts to the accept page", () => {
    expect(adminInvitePath("abc_DEF-123", true)).toBe("/admin-invite/accept?token=abc_DEF-123")
  })

  it("sends new emails to signup", () => {
    expect(adminInvitePath("abc_DEF-123", false)).toBe("/signup?adminInvite=abc_DEF-123")
  })

  it("encodes tokens so they survive being put in a URL", () => {
    expect(adminInvitePath("a b&c", true)).toBe("/admin-invite/accept?token=a%20b%26c")
    expect(adminInvitePath("a b&c", false)).toBe("/signup?adminInvite=a%20b%26c")
  })
})
