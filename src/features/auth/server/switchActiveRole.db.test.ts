import { afterEach, describe, expect, it, vi } from "vitest"
import { AuthorizationError } from "blitz"
import db, { type UserRole } from "db"

vi.mock("@/src/app/blitz-server", () => ({ getBlitzContext: vi.fn() }))

import { switchActiveRole } from "./switchActiveRole"

const TEST_PREFIX = "switch-role-db-test"

let counter = 0
async function createUser(...roles: UserRole[]) {
  return db.user.create({
    data: { email: `${TEST_PREFIX}-${Date.now()}-${counter++}@example.com`, roles },
  })
}

function sessionFor(userId: number, role: UserRole) {
  return { userId, role, $authorize: vi.fn(), $setPublicData: vi.fn() } as any
}

describe("switchActiveRole", () => {
  afterEach(async () => {
    await db.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  })

  it("lets an account holding both roles switch back and forth", async () => {
    const dual = await createUser("RESEARCHER", "ADMIN")

    const asAdmin = sessionFor(dual.id, "ADMIN")
    await expect(switchActiveRole({ role: "RESEARCHER" }, asAdmin)).resolves.toEqual({
      activeRole: "RESEARCHER",
    })
    expect(asAdmin.$setPublicData).toHaveBeenCalledWith({ role: "RESEARCHER" })

    const asResearcher = sessionFor(dual.id, "RESEARCHER")
    await expect(switchActiveRole({ role: "ADMIN" }, asResearcher)).resolves.toEqual({
      activeRole: "ADMIN",
    })
    expect(asResearcher.$setPublicData).toHaveBeenCalledWith({ role: "ADMIN" })
  })

  it("does not let a researcher become an admin by asking for it", async () => {
    const researcher = await createUser("RESEARCHER")
    const session = sessionFor(researcher.id, "RESEARCHER")

    await expect(switchActiveRole({ role: "ADMIN" }, session)).rejects.toThrow(AuthorizationError)
    expect(session.$setPublicData).not.toHaveBeenCalled()
  })

  it("does not let an admin without a researcher account become a researcher", async () => {
    const admin = await createUser("ADMIN")
    const session = sessionFor(admin.id, "ADMIN")

    await expect(switchActiveRole({ role: "RESEARCHER" }, session)).rejects.toThrow(
      AuthorizationError
    )
    expect(session.$setPublicData).not.toHaveBeenCalled()
  })

  it("does not let a participant switch to any role", async () => {
    const participant = await createUser("PARTICIPANT")
    const session = sessionFor(participant.id, "PARTICIPANT")

    await expect(switchActiveRole({ role: "RESEARCHER" }, session)).rejects.toThrow(
      AuthorizationError
    )
    await expect(switchActiveRole({ role: "ADMIN" }, session)).rejects.toThrow(AuthorizationError)
    expect(session.$setPublicData).not.toHaveBeenCalled()
  })

  it("only ever offers researcher and admin, never superadmin", async () => {
    const dual = await createUser("RESEARCHER", "ADMIN")

    await expect(
      switchActiveRole({ role: "SUPERADMIN" }, sessionFor(dual.id, "ADMIN"))
    ).rejects.toThrow()
  })

  it("treats switching to the role already in use as a no-op", async () => {
    const dual = await createUser("RESEARCHER", "ADMIN")
    const session = sessionFor(dual.id, "ADMIN")

    await expect(switchActiveRole({ role: "ADMIN" }, session)).resolves.toEqual({
      activeRole: "ADMIN",
    })
    expect(session.$setPublicData).not.toHaveBeenCalled()
  })

  it("requires a logged-in user", async () => {
    const session = {
      userId: null,
      role: undefined,
      $authorize: vi.fn(() => {
        throw new Error("not authenticated")
      }),
      $setPublicData: vi.fn(),
    } as any

    await expect(switchActiveRole({ role: "ADMIN" }, session)).rejects.toThrow()
  })
})
