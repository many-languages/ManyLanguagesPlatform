import { createHash } from "crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import db, { type UserRole } from "db"

const mocks = vi.hoisted(() => ({
  ensureResearcherProvisioned: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({ getBlitzContext: vi.fn() }))
vi.mock("@/src/lib/jatos/tokenBroker", () => ({
  ensureResearcherProvisioned: mocks.ensureResearcherProvisioned,
}))
vi.mock("@blitzjs/auth/secure-password", () => ({
  SecurePassword: { hash: vi.fn(async () => "hashed"), VALID_NEEDS_REHASH: "needs-rehash" },
}))

import { ADMIN_INVITE_EXISTING_ACCOUNT_ERROR } from "@/src/features/admin-invitations/constants"
import { signupUser } from "./signup"

const TEST_PREFIX = "signup-db-test"
const PASSWORD = "a-long-enough-password"
const hash = (token: string) => createHash("sha256").update(token).digest("hex")

let counter = 0
const unique = () => `${Date.now()}-${counter++}`
const emailFor = (name: string) => `${TEST_PREFIX}-${name}-${unique()}@example.com`

function fakeSession() {
  return { $create: vi.fn() } as any
}

async function createInvite(email: string) {
  const token = `${TEST_PREFIX}-token-${unique()}`
  const invite = await db.adminInvite.create({
    data: { email, token: hash(token), expiresAt: new Date(Date.now() + 3_600_000) },
  })
  return { token, invite }
}

describe("signupUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureResearcherProvisioned.mockResolvedValue(undefined)
  })

  afterEach(async () => {
    await db.adminInvite.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
    await db.session.deleteMany({ where: { user: { email: { startsWith: TEST_PREFIX } } } })
    await db.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  })

  it("creates a participant with a single role and starts the session as that role", async () => {
    const email = emailFor("participant")
    const session = fakeSession()

    const result = await signupUser({ email, password: PASSWORD, role: "PARTICIPANT" }, session)

    expect(result).toMatchObject({
      activeRole: "PARTICIPANT",
      user: { email, roles: ["PARTICIPANT"] },
    })
    expect(session.$create).toHaveBeenCalledWith({
      userId: (result as any).user.id,
      role: "PARTICIPANT",
    })
  })

  it("signs a brand-new admin up with an invite and records who redeemed it", async () => {
    const email = emailFor("new-admin")
    const { token, invite } = await createInvite(email)
    const session = fakeSession()

    const result = await signupUser(
      { email, password: PASSWORD, role: "ADMIN" as UserRole, adminInviteToken: token },
      session
    )

    expect(result).toMatchObject({ activeRole: "ADMIN", user: { roles: ["ADMIN"] } })
    const redeemed = await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })
    expect(redeemed.redeemedAt).not.toBeNull()
    expect(redeemed.redeemedById).toBe((result as any).user.id)
  })

  it("does not let an invite create a second account for an email that already has one, and keeps the invite usable", async () => {
    const researcher = await db.user.create({
      data: { email: emailFor("researcher"), roles: ["RESEARCHER"], hashedPassword: "x" },
    })
    const { token, invite } = await createInvite(researcher.email)

    const result = await signupUser(
      {
        email: researcher.email,
        password: PASSWORD,
        role: "ADMIN" as UserRole,
        adminInviteToken: token,
      },
      fakeSession()
    )

    expect(result).toEqual({ error: ADMIN_INVITE_EXISTING_ACCOUNT_ERROR })
    expect((await db.user.findUniqueOrThrow({ where: { id: researcher.id } })).roles).toEqual([
      "RESEARCHER",
    ])
    expect(
      (await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })).redeemedAt
    ).toBeNull()
  })

  it("refuses an admin invite whose email belongs to a participant", async () => {
    const participant = await db.user.create({
      data: { email: emailFor("participant"), roles: ["PARTICIPANT"], hashedPassword: "x" },
    })
    const { token } = await createInvite(participant.email)

    const result = await signupUser(
      {
        email: participant.email,
        password: PASSWORD,
        role: "ADMIN" as UserRole,
        adminInviteToken: token,
      },
      fakeSession()
    )

    expect(result).toEqual({ error: expect.stringMatching(/participants cannot be promoted/i) })
  })

  it("rejects the admin role without an invite", async () => {
    const result = await signupUser(
      { email: emailFor("sneaky"), password: PASSWORD, role: "ADMIN" as UserRole },
      fakeSession()
    )

    expect(result).toEqual({ error: "Admin role requires a valid invite token" })
  })
})
