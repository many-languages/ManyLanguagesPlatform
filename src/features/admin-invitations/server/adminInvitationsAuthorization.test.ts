import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthorizedSession: vi.fn(),
  adminInviteCreate: vi.fn(),
  adminInviteFindMany: vi.fn(),
  adminInviteUpdate: vi.fn(),
  adminInviteUpdateMany: vi.fn(),
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
  },
}))

vi.mock("mailers/adminInvitationMailer", () => ({
  adminInvitationMailer: vi.fn(() => ({ send: mocks.sendInvite })),
}))

vi.mock("@/mailers/reminderAdminInvitationMailer", () => ({
  reminderAdminInvitationMailer: vi.fn(() => ({ send: mocks.sendReminder })),
}))

import { createAdminInvite } from "./createAdminInvite"
import { revokeAdminInvites } from "./revokeAdminInvites"
import { sendAdminInviteReminders } from "./sendAdminInviteReminders"
import { getAdminInvitesRsc } from "./getAdminInvites"

describe("admin invitation server helper authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      id: 10,
      email: "admin@example.com",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      token: expect.any(String),
    })
    expect(result.token).not.toBe("hashed-token")
    expect(mocks.sendInvite).toHaveBeenCalled()
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
