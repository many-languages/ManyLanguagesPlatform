import { createHash } from "crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import db from "db"

const mocks = vi.hoisted(() => ({
  getAuthorizedSession: vi.fn(),
}))

vi.mock("@/src/lib/auth/session", () => ({ getAuthorizedSession: mocks.getAuthorizedSession }))

import { revokeAdminInvites } from "./revokeAdminInvites"

const TEST_PREFIX = "revoke-invite-db-test"
const hash = (token: string) => createHash("sha256").update(token).digest("hex")

let counter = 0
const unique = () => `${Date.now()}-${counter++}`

async function createInvite(
  overrides: { expiresAt?: Date; redeemedAt?: Date; revokedAt?: Date } = {}
) {
  return db.adminInvite.create({
    data: {
      email: `${TEST_PREFIX}-${unique()}@example.com`,
      token: hash(`${TEST_PREFIX}-${unique()}`),
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 3_600_000),
      redeemedAt: overrides.redeemedAt,
      revokedAt: overrides.revokedAt,
    },
  })
}

const reload = (id: number) => db.adminInvite.findUniqueOrThrow({ where: { id } })

describe("revoking admin invites", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role: "SUPERADMIN" })
  })

  afterEach(async () => {
    await db.adminInvite.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  })

  it("revokes a pending invite", async () => {
    const invite = await createInvite()

    await expect(revokeAdminInvites([invite.id])).resolves.toEqual({
      revoked: 1,
      skipped: 0,
      skippedEmails: [],
    })
    expect((await reload(invite.id)).revokedAt).not.toBeNull()
  })

  it("does not revoke an invite that was already redeemed, and says why", async () => {
    const redeemed = await createInvite({ redeemedAt: new Date() })

    const result = await revokeAdminInvites([redeemed.id])

    expect(result.revoked).toBe(0)
    expect(result.skippedEmails).toEqual([
      {
        email: redeemed.email,
        reason: expect.stringMatching(/already redeemed.*keeps its admin access/),
      },
    ])
    const after = await reload(redeemed.id)
    expect(after.revokedAt).toBeNull()
    expect(after.redeemedAt).not.toBeNull()
  })

  it("skips expired and already revoked invites too, leaving them untouched", async () => {
    const expired = await createInvite({ expiresAt: new Date(Date.now() - 1000) })
    const alreadyRevoked = await createInvite({ revokedAt: new Date(Date.now() - 5000) })
    const revokedAtBefore = (await reload(alreadyRevoked.id)).revokedAt

    const result = await revokeAdminInvites([expired.id, alreadyRevoked.id])

    expect(result.revoked).toBe(0)
    expect(result.skippedEmails.map((s) => s.reason).sort()).toEqual([
      "already expired",
      "already revoked",
    ])
    expect((await reload(expired.id)).revokedAt).toBeNull()
    expect((await reload(alreadyRevoked.id)).revokedAt).toEqual(revokedAtBefore)
  })

  it("revokes only the pending ones in a mixed selection", async () => {
    const pending = await createInvite()
    const redeemed = await createInvite({ redeemedAt: new Date() })

    const result = await revokeAdminInvites([pending.id, redeemed.id])

    expect(result.revoked).toBe(1)
    expect(result.skipped).toBe(1)
    expect((await reload(pending.id)).revokedAt).not.toBeNull()
    expect((await reload(redeemed.id)).revokedAt).toBeNull()
  })

  it("is for superadmins only", async () => {
    const pending = await createInvite()

    for (const role of ["ADMIN", "RESEARCHER", "PARTICIPANT"] as const) {
      mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role })
      await expect(revokeAdminInvites([pending.id])).rejects.toThrow()
    }
    expect((await reload(pending.id)).revokedAt).toBeNull()
  })
})
