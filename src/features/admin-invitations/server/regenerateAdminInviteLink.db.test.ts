import { createHash } from "crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import db, { type UserRole } from "db"

const mocks = vi.hoisted(() => ({
  getAuthorizedSession: vi.fn(),
}))

vi.mock("@/src/lib/auth/session", () => ({ getAuthorizedSession: mocks.getAuthorizedSession }))

import { regenerateAdminInviteLink } from "./regenerateAdminInviteLink"
import { validateAdminInviteToken } from "./validateAdminInviteToken"

const TEST_PREFIX = "regenerate-invite-db-test"
const hash = (token: string) => createHash("sha256").update(token).digest("hex")

let counter = 0
const unique = () => `${Date.now()}-${counter++}`

async function createUser(name: string, ...roles: UserRole[]) {
  return db.user.create({
    data: { email: `${TEST_PREFIX}-${name}-${unique()}@example.com`, roles },
  })
}

async function createInvite(
  email: string,
  overrides: { expiresAt?: Date; redeemedAt?: Date; revokedAt?: Date } = {}
) {
  const token = `${TEST_PREFIX}-original-${unique()}`
  const invite = await db.adminInvite.create({
    data: {
      email,
      token: hash(token),
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 3_600_000),
      redeemedAt: overrides.redeemedAt,
      revokedAt: overrides.revokedAt,
    },
  })
  return { token, invite }
}

const asSuperAdmin = async () => {
  const superadmin = await createUser("superadmin", "SUPERADMIN")
  mocks.getAuthorizedSession.mockResolvedValue({ userId: superadmin.id, role: "SUPERADMIN" })
  return superadmin
}

describe("regenerating an admin invite link", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await db.adminAuditEvent.deleteMany({
      where: { actor: { email: { startsWith: TEST_PREFIX } } },
    })
    await db.adminInvite.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
    await db.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  })

  it("issues a new working token, kills the old one and stores only the hash", async () => {
    const superadmin = await asSuperAdmin()
    const { token: original, invite } = await createInvite(
      `${TEST_PREFIX}-new-${unique()}@example.com`
    )

    const result = await regenerateAdminInviteLink(invite.id)
    if (!result.ok) throw new Error(result.error)

    expect(result.token).not.toBe(original)
    expect(result.existingAccount).toBe(false)

    await expect(validateAdminInviteToken({ token: original })).resolves.toEqual({
      valid: false,
      error: "Invalid invite token",
    })
    await expect(validateAdminInviteToken({ token: result.token })).resolves.toMatchObject({
      valid: true,
    })

    const stored = await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })
    expect(stored.token).toBe(hash(result.token))
    expect(stored.token).not.toBe(result.token)
    // Only the token changed: expiry is kept and no reminder email is recorded.
    expect(stored.expiresAt).toEqual(invite.expiresAt)
    expect(stored.reminderSentAt).toBeNull()
    expect(stored.redeemedAt).toBeNull()

    const audit = await db.adminAuditEvent.findFirstOrThrow({
      where: { event: "admin_invite_link_regenerated", entityId: invite.id },
    })
    expect(audit).toMatchObject({
      actorUserId: superadmin.id,
      actorRole: "SUPERADMIN",
      entityType: "AdminInvite",
    })
    // The audit trail records that a link was issued, never the token itself.
    expect(JSON.stringify(audit)).not.toContain(result.token)
  })

  it("points an existing researcher at the accept flow", async () => {
    await asSuperAdmin()
    const researcher = await createUser("researcher", "RESEARCHER")
    const { invite } = await createInvite(researcher.email)

    await expect(regenerateAdminInviteLink(invite.id)).resolves.toMatchObject({
      ok: true,
      existingAccount: true,
    })
  })

  it.each([
    ["expired", { expiresAt: new Date(Date.now() - 1000) }, /expired/],
    ["revoked", { revokedAt: new Date() }, /revoked/],
    ["already redeemed", { redeemedAt: new Date() }, /already been redeemed/],
  ])("refuses a %s invite and leaves its token alone", async (_label, overrides, message) => {
    await asSuperAdmin()
    const { invite } = await createInvite(`${TEST_PREFIX}-x-${unique()}@example.com`, overrides)
    const before = await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })

    await expect(regenerateAdminInviteLink(invite.id)).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(message),
    })
    expect((await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })).token).toBe(
      before.token
    )
  })

  it.each([
    ["a participant", ["PARTICIPANT"] as UserRole[], /participants cannot be promoted/i],
    ["an admin", ["ADMIN"] as UserRole[], /already belongs to an admin/],
  ])("refuses when the email now belongs to %s", async (_label, roles, message) => {
    await asSuperAdmin()
    const user = await createUser("user", ...roles)
    const { invite } = await createInvite(user.email)
    const before = await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })

    await expect(regenerateAdminInviteLink(invite.id)).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(message),
    })
    expect((await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })).token).toBe(
      before.token
    )
  })

  it("is for superadmins only", async () => {
    const { invite } = await createInvite(`${TEST_PREFIX}-x-${unique()}@example.com`)
    const before = await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })

    for (const role of ["ADMIN", "RESEARCHER", "PARTICIPANT"] as const) {
      mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role })
      await expect(regenerateAdminInviteLink(invite.id)).rejects.toThrow()
    }

    expect((await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })).token).toBe(
      before.token
    )
  })

  it("reports an unknown invite", async () => {
    await asSuperAdmin()

    await expect(regenerateAdminInviteLink(2_000_000_000)).resolves.toEqual({
      ok: false,
      error: "Invite not found",
    })
  })
})
