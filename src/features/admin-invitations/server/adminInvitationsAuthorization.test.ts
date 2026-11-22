import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthorizedSession: vi.fn(),
  adminInviteCreate: vi.fn(),
  adminInviteFindMany: vi.fn(),
  adminInviteUpdate: vi.fn(),
  adminInviteUpdateMany: vi.fn(),
  userFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  sendInvite: vi.fn(),
  sendReminder: vi.fn(),
}))

vi.mock("@/src/lib/auth/session", () => ({
  getAuthorizedSession: mocks.getAuthorizedSession,
}))

vi.mock("db", () => ({
  default: {
    adminInvite: {
      create: mocks.adminInviteCreate,
      findMany: mocks.adminInviteFindMany,
      update: mocks.adminInviteUpdate,
      updateMany: mocks.adminInviteUpdateMany,
    },
    user: {
      findUnique: mocks.userFindUnique,
      findMany: mocks.userFindMany,
    },
  },
}))

vi.mock("mailers/adminInvitationMailer", () => ({
  adminInvitationMailer: vi.fn(() => ({ send: mocks.sendInvite })),
}))

vi.mock("@/mailers/reminderAdminInvitationMailer", () => ({
  reminderAdminInvitationMailer: vi.fn(() => ({ send: mocks.sendReminder })),
}))

import { adminInvitationMailer } from "mailers/adminInvitationMailer"
import { reminderAdminInvitationMailer } from "@/mailers/reminderAdminInvitationMailer"
import { createAdminInvite } from "./createAdminInvite"
import { revokeAdminInvites } from "./revokeAdminInvites"
import { sendAdminInviteReminders } from "./sendAdminInviteReminders"
import { getAdminInvitesRsc } from "./getAdminInvites"

describe("admin invitation server helper authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // No account uses the invited email unless a test says otherwise.
    mocks.userFindUnique.mockResolvedValue(null)
    mocks.userFindMany.mockResolvedValue([])
  })

  it("rejects direct createAdminInvite calls from non-superadmins", async () => {
    mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role: "ADMIN" })

    await expect(
      createAdminInvite({ email: "admin@example.com", expiresInHours: 24 })
    ).rejects.toThrow()

    expect(mocks.adminInviteCreate).not.toHaveBeenCalled()
    expect(mocks.sendInvite).not.toHaveBeenCalled()
  })

  it("rejects direct revokeAdminInvites calls from non-superadmins", async () => {
    mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role: "ADMIN" })

    await expect(revokeAdminInvites([1, 2])).rejects.toThrow()

    expect(mocks.adminInviteUpdateMany).not.toHaveBeenCalled()
  })

  it("rejects direct sendAdminInviteReminders calls from non-superadmins", async () => {
    mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role: "ADMIN" })

    await expect(sendAdminInviteReminders([1, 2])).rejects.toThrow()

    expect(mocks.adminInviteFindMany).not.toHaveBeenCalled()
    expect(mocks.adminInviteUpdate).not.toHaveBeenCalled()
    expect(mocks.sendReminder).not.toHaveBeenCalled()
  })

  it("creates an invite for superadmins and returns only the plaintext token, not the hash", async () => {
    mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role: "SUPERADMIN" })
    mocks.adminInviteCreate.mockResolvedValue({
      id: 10,
      email: "admin@example.com",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      token: "hashed-token",
    })

    const result = await createAdminInvite({ email: "admin@example.com", expiresInHours: 24 })
    if (!result.ok) throw new Error(`expected invite to be created: ${result.error}`)

    expect(mocks.adminInviteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "admin@example.com",
          createdById: 1,
          token: expect.any(String),
        }),
      })
    )
    expect(result).toEqual({
      ok: true,
      id: 10,
      email: "admin@example.com",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      token: expect.any(String),
      existingAccount: false,
    })
    expect(result.token).not.toBe("hashed-token")
    expect(mocks.sendInvite).toHaveBeenCalled()
  })

  it("normalizes the invited email before looking it up and storing it", async () => {
    mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role: "SUPERADMIN" })
    mocks.adminInviteCreate.mockResolvedValue({
      id: 10,
      email: "admin@example.com",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    })

    await createAdminInvite({ email: "  Admin@Example.com ", expiresInHours: 24 })

    expect(mocks.userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "admin@example.com" } })
    )
    expect(mocks.adminInviteCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "admin@example.com" }) })
    )
  })

  it("sends existing researchers the accept link and flags the invite as for an existing account", async () => {
    mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role: "SUPERADMIN" })
    mocks.userFindUnique.mockResolvedValue({ roles: ["RESEARCHER"] })
    mocks.adminInviteCreate.mockResolvedValue({
      id: 11,
      email: "researcher@example.com",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    })

    const result = await createAdminInvite({ email: "researcher@example.com", expiresInHours: 24 })

    expect(result).toMatchObject({ ok: true, existingAccount: true })
    expect(adminInvitationMailer).toHaveBeenCalledWith(
      expect.objectContaining({ to: "researcher@example.com", existingAccount: true })
    )
  })

  it.each([
    ["a participant", ["PARTICIPANT"], /participant/i],
    ["an admin", ["ADMIN"], /already belongs to an admin/i],
    ["a superadmin", ["SUPERADMIN"], /already belongs to an admin/i],
    ["a researcher who is also an admin", ["RESEARCHER", "ADMIN"], /already belongs to an admin/i],
  ])(
    "refuses to create or send an invite for an email that belongs to %s",
    async (_label, roles, message) => {
      mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role: "SUPERADMIN" })
      mocks.userFindUnique.mockResolvedValue({ roles })

      const result = await createAdminInvite({ email: "taken@example.com", expiresInHours: 24 })

      expect(result).toEqual({ ok: false, error: expect.stringMatching(message) })
      expect(mocks.adminInviteCreate).not.toHaveBeenCalled()
      expect(mocks.sendInvite).not.toHaveBeenCalled()
    }
  )

  it("skips reminders for pending invites whose email has since become a participant or admin", async () => {
    mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role: "SUPERADMIN" })
    const future = new Date(Date.now() + 3_600_000)
    mocks.adminInviteFindMany.mockResolvedValue([
      { id: 1, email: "new@example.com", redeemedAt: null, revokedAt: null, expiresAt: future },
      { id: 2, email: "Part@example.com", redeemedAt: null, revokedAt: null, expiresAt: future },
      { id: 3, email: "res@example.com", redeemedAt: null, revokedAt: null, expiresAt: future },
    ])
    mocks.userFindMany.mockResolvedValue([
      { email: "part@example.com", roles: ["PARTICIPANT"] },
      { email: "res@example.com", roles: ["RESEARCHER"] },
    ])
    mocks.adminInviteUpdate.mockResolvedValue({})

    const result = await sendAdminInviteReminders([1, 2, 3])

    expect(result.sentEmails).toEqual(["new@example.com", "res@example.com"])
    expect(result.skippedEmails).toEqual([
      { email: "Part@example.com", reason: "email belongs to a participant account" },
    ])
    expect(reminderAdminInvitationMailer).toHaveBeenCalledWith(
      expect.objectContaining({ to: "res@example.com", existingAccount: true })
    )
    expect(reminderAdminInvitationMailer).toHaveBeenCalledWith(
      expect.objectContaining({ to: "new@example.com", existingAccount: false })
    )
  })

  it("list queries do not select hashed invite tokens", async () => {
    mocks.getAuthorizedSession.mockResolvedValue({ userId: 1, role: "SUPERADMIN" })
    mocks.adminInviteFindMany.mockResolvedValue([])

    await getAdminInvitesRsc()

    expect(mocks.adminInviteFindMany).toHaveBeenCalledWith({
      select: expect.not.objectContaining({ token: true }),
      orderBy: { createdAt: "desc" },
    })
  })
})
