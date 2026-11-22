import { createHash } from "crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import db, { type User, type UserRole } from "db"

const mocks = vi.hoisted(() => ({
  ensureResearcherProvisioned: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({ getBlitzContext: vi.fn() }))
vi.mock("@/src/lib/jatos/tokenBroker", () => ({
  ensureResearcherProvisioned: mocks.ensureResearcherProvisioned,
}))

import { acceptAdminInvite } from "./acceptAdminInvite"
import { findPendingAdminInviteForUser } from "./getPendingAdminInviteForAccount"
import { validateAdminInviteToken } from "./validateAdminInviteToken"

const TEST_PREFIX = "accept-admin-invite-db-test"
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
  const token = `${TEST_PREFIX}-token-${unique()}`
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

function sessionFor(user: User | null, role: UserRole) {
  return {
    userId: user?.id ?? null,
    role,
    $authorize: vi.fn(() => {
      if (!user) throw new Error("not authenticated")
    }),
    $setPublicData: vi.fn(),
  } as any
}

describe("accepting an admin invite with an existing account", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureResearcherProvisioned.mockResolvedValue(undefined)
  })

  afterEach(async () => {
    await db.adminAuditEvent.deleteMany({
      where: { actor: { email: { startsWith: TEST_PREFIX } } },
    })
    await db.adminInvite.deleteMany({
      where: { email: { startsWith: TEST_PREFIX, mode: "insensitive" } },
    })
    await db.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  })

  it("adds the ADMIN role to a researcher, keeps RESEARCHER, redeems the invite and switches the session", async () => {
    const researcher = await createUser("researcher", "RESEARCHER")
    const { token, invite } = await createInvite(researcher.email)
    const session = sessionFor(researcher, "RESEARCHER")

    await expect(acceptAdminInvite({ token }, session)).resolves.toEqual({
      ok: true,
      activeRole: "ADMIN",
    })

    const updated = await db.user.findUniqueOrThrow({ where: { id: researcher.id } })
    expect([...updated.roles].sort()).toEqual(["ADMIN", "RESEARCHER"])

    const redeemed = await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })
    expect(redeemed.redeemedAt).not.toBeNull()
    expect(redeemed.redeemedById).toBe(researcher.id)

    expect(session.$setPublicData).toHaveBeenCalledWith({ role: "ADMIN" })

    const audit = await db.adminAuditEvent.findFirstOrThrow({
      where: { event: "admin_invite_accepted", entityId: invite.id },
    })
    expect(audit).toMatchObject({
      actorUserId: researcher.id,
      actorRole: "RESEARCHER",
      entityType: "AdminInvite",
    })
    expect(audit.metadata).toMatchObject({ grantedRole: "ADMIN", previousRoles: ["RESEARCHER"] })
  })

  it("is single-use", async () => {
    const researcher = await createUser("researcher", "RESEARCHER")
    const { token } = await createInvite(researcher.email)

    await acceptAdminInvite({ token }, sessionFor(researcher, "RESEARCHER"))
    const again = await acceptAdminInvite({ token }, sessionFor(researcher, "ADMIN"))

    expect(again).toEqual({ ok: false, error: "This invite has already been redeemed" })
    const updated = await db.user.findUniqueOrThrow({ where: { id: researcher.id } })
    expect(updated.roles.filter((role) => role === "ADMIN")).toHaveLength(1)
  })

  it("never promotes a participant, and leaves the invite unredeemed", async () => {
    const participant = await createUser("participant", "PARTICIPANT")
    const { token, invite } = await createInvite(participant.email)
    const session = sessionFor(participant, "PARTICIPANT")

    const result = await acceptAdminInvite({ token }, session)

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/participants cannot be promoted/i),
    })
    expect((await db.user.findUniqueOrThrow({ where: { id: participant.id } })).roles).toEqual([
      "PARTICIPANT",
    ])
    expect(
      (await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })).redeemedAt
    ).toBeNull()
    expect(session.$setPublicData).not.toHaveBeenCalled()
  })

  it("requires the invite to have been sent to the logged-in account's email", async () => {
    const owner = await createUser("owner", "RESEARCHER")
    const otherResearcher = await createUser("other", "RESEARCHER")
    const { token, invite } = await createInvite(owner.email)

    const result = await acceptAdminInvite({ token }, sessionFor(otherResearcher, "RESEARCHER"))

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/different email address/) })
    expect((await db.user.findUniqueOrThrow({ where: { id: otherResearcher.id } })).roles).toEqual([
      "RESEARCHER",
    ])
    expect(
      (await db.adminInvite.findUniqueOrThrow({ where: { id: invite.id } })).redeemedAt
    ).toBeNull()
  })

  it("requires possession of the emailed token: a matching email alone is not enough", async () => {
    const researcher = await createUser("researcher", "RESEARCHER")
    await createInvite(researcher.email)

    const result = await acceptAdminInvite(
      { token: "guessed-token" },
      sessionFor(researcher, "RESEARCHER")
    )

    expect(result).toEqual({ ok: false, error: "Invalid invite token" })
    expect((await db.user.findUniqueOrThrow({ where: { id: researcher.id } })).roles).toEqual([
      "RESEARCHER",
    ])
  })

  it.each([
    ["expired", { expiresAt: new Date(Date.now() - 1000) }, "This invite has expired"],
    ["revoked", { revokedAt: new Date() }, "This invite has been revoked"],
  ])("rejects a %s invite", async (_label, overrides, error) => {
    const researcher = await createUser("researcher", "RESEARCHER")
    const { token } = await createInvite(researcher.email, overrides)

    await expect(
      acceptAdminInvite({ token }, sessionFor(researcher, "RESEARCHER"))
    ).resolves.toEqual({
      ok: false,
      error,
    })
    expect((await db.user.findUniqueOrThrow({ where: { id: researcher.id } })).roles).toEqual([
      "RESEARCHER",
    ])
  })

  it("has nothing to grant an account that is already an admin", async () => {
    const dual = await createUser("dual", "RESEARCHER", "ADMIN")
    const { token } = await createInvite(dual.email)

    const result = await acceptAdminInvite({ token }, sessionFor(dual, "RESEARCHER"))

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/already belongs to an admin/),
    })
    expect((await db.user.findUniqueOrThrow({ where: { id: dual.id } })).roles).toEqual([
      "RESEARCHER",
      "ADMIN",
    ])
  })

  it("matches the invited email regardless of case", async () => {
    const researcher = await createUser("researcher", "RESEARCHER")
    const { token } = await createInvite(researcher.email.toUpperCase())

    await expect(
      acceptAdminInvite({ token }, sessionFor(researcher, "RESEARCHER"))
    ).resolves.toMatchObject({
      ok: true,
    })
  })

  it("requires a logged-in user", async () => {
    const researcher = await createUser("researcher", "RESEARCHER")
    const { token } = await createInvite(researcher.email)

    await expect(acceptAdminInvite({ token }, sessionFor(null, "RESEARCHER"))).rejects.toThrow()
    expect((await db.user.findUniqueOrThrow({ where: { id: researcher.id } })).roles).toEqual([
      "RESEARCHER",
    ])
  })
})

describe("validating an admin invite token", () => {
  afterEach(async () => {
    await db.adminInvite.deleteMany({
      where: { email: { startsWith: TEST_PREFIX, mode: "insensitive" } },
    })
    await db.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  })

  it("flags an email that already has a researcher account, so the invitee logs in instead", async () => {
    const researcher = await createUser("researcher", "RESEARCHER")
    const { token } = await createInvite(researcher.email)

    await expect(validateAdminInviteToken({ token })).resolves.toMatchObject({
      valid: true,
      existingAccount: true,
    })
  })

  it("lets a brand-new email sign up", async () => {
    const { token } = await createInvite(`${TEST_PREFIX}-new-${unique()}@example.com`)

    await expect(validateAdminInviteToken({ token })).resolves.toMatchObject({
      valid: true,
      existingAccount: false,
    })
  })

  it("rejects the invite when the email belongs to a participant or an admin", async () => {
    const participant = await createUser("participant", "PARTICIPANT")
    const admin = await createUser("admin", "ADMIN")
    const participantInvite = await createInvite(participant.email)
    const adminInvite = await createInvite(admin.email)

    await expect(
      validateAdminInviteToken({ token: participantInvite.token })
    ).resolves.toMatchObject({
      valid: false,
      error: expect.stringMatching(/participants cannot be promoted/i),
    })
    await expect(validateAdminInviteToken({ token: adminInvite.token })).resolves.toMatchObject({
      valid: false,
      error: expect.stringMatching(/already belongs to an admin/),
    })
  })
})

describe("pending admin invite hint for the dashboard", () => {
  afterEach(async () => {
    await db.adminInvite.deleteMany({
      where: { email: { startsWith: TEST_PREFIX, mode: "insensitive" } },
    })
    await db.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  })

  it("finds a usable invite addressed to a researcher's email, ignoring email case", async () => {
    const researcher = await createUser("researcher", "RESEARCHER")
    const { invite } = await createInvite(researcher.email.toUpperCase())

    await expect(findPendingAdminInviteForUser(researcher.id)).resolves.toEqual({
      expiresAt: invite.expiresAt,
    })
  })

  it("prefers the invite that lasts longest when there are several", async () => {
    const researcher = await createUser("researcher", "RESEARCHER")
    await createInvite(researcher.email, { expiresAt: new Date(Date.now() + 60_000) })
    const later = await createInvite(researcher.email, {
      expiresAt: new Date(Date.now() + 7_200_000),
    })

    await expect(findPendingAdminInviteForUser(researcher.id)).resolves.toEqual({
      expiresAt: later.invite.expiresAt,
    })
  })

  it.each([
    ["expired", { expiresAt: new Date(Date.now() - 1000) }],
    ["revoked", { revokedAt: new Date() }],
    ["already redeemed", { redeemedAt: new Date() }],
  ])("shows nothing for a %s invite", async (_label, overrides) => {
    const researcher = await createUser("researcher", "RESEARCHER")
    await createInvite(researcher.email, overrides)

    await expect(findPendingAdminInviteForUser(researcher.id)).resolves.toBeNull()
  })

  it("shows nothing when the invite was sent to someone else", async () => {
    const researcher = await createUser("researcher", "RESEARCHER")
    const someoneElse = await createUser("someone-else", "RESEARCHER")
    await createInvite(someoneElse.email)

    await expect(findPendingAdminInviteForUser(researcher.id)).resolves.toBeNull()
  })

  it.each([
    ["a participant", ["PARTICIPANT"]],
    ["an admin", ["ADMIN"]],
    ["a researcher who is already an admin", ["RESEARCHER", "ADMIN"]],
  ] as const)("shows nothing to %s, who could not accept it", async (_label, roles) => {
    const user = await createUser("user", ...roles)
    await createInvite(user.email)

    await expect(findPendingAdminInviteForUser(user.id)).resolves.toBeNull()
  })

  it("does not expose the token: the hint only says an invitation exists", async () => {
    const researcher = await createUser("researcher", "RESEARCHER")
    await createInvite(researcher.email)

    const hint = await findPendingAdminInviteForUser(researcher.id)
    expect(Object.keys(hint ?? {})).toEqual(["expiresAt"])
  })
})
