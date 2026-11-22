import { describe, expect, it } from "vitest"
import { getAdminInviteStatus } from "./inviteStatus"

const now = new Date("2026-06-01T12:00:00.000Z")
const future = new Date("2026-06-02T12:00:00.000Z")
const past = new Date("2026-05-31T12:00:00.000Z")

describe("getAdminInviteStatus", () => {
  it("is pending while unused and unexpired", () => {
    expect(
      getAdminInviteStatus({ redeemedAt: null, revokedAt: null, expiresAt: future }, now)
    ).toBe("pending")
  })

  it("is expired once the expiry has passed", () => {
    expect(getAdminInviteStatus({ redeemedAt: null, revokedAt: null, expiresAt: past }, now)).toBe(
      "expired"
    )
    expect(getAdminInviteStatus({ redeemedAt: null, revokedAt: null, expiresAt: now }, now)).toBe(
      "expired"
    )
  })

  it("is revoked when revoked before being used", () => {
    expect(
      getAdminInviteStatus({ redeemedAt: null, revokedAt: past, expiresAt: future }, now)
    ).toBe("revoked")
  })

  it("stays redeemed even if a revoke was recorded afterwards or the invite has since expired", () => {
    expect(getAdminInviteStatus({ redeemedAt: past, revokedAt: now, expiresAt: future }, now)).toBe(
      "redeemed"
    )
    expect(getAdminInviteStatus({ redeemedAt: past, revokedAt: null, expiresAt: past }, now)).toBe(
      "redeemed"
    )
  })
})
