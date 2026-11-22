import { describe, expect, it } from "vitest"
import {
  canSwitchToRole,
  describeAdminInviteIneligibility,
  getAdminInviteEligibility,
  getSwitchTargetRole,
  hasRole,
  hasStaffAdminRole,
  isStaffAdmin,
  pickInitialRole,
  staffAdminUsersWhere,
} from "./roles"

describe("role helpers", () => {
  it("recognises staff admins by the role currently in use", () => {
    expect(isStaffAdmin("ADMIN")).toBe(true)
    expect(isStaffAdmin("SUPERADMIN")).toBe(true)
    expect(isStaffAdmin("RESEARCHER")).toBe(false)
    expect(isStaffAdmin(null)).toBe(false)
  })

  it("recognises staff admins by the roles an account holds, however many it has", () => {
    expect(hasStaffAdminRole(["RESEARCHER", "ADMIN"])).toBe(true)
    expect(hasStaffAdminRole(["SUPERADMIN"])).toBe(true)
    expect(hasStaffAdminRole(["RESEARCHER"])).toBe(false)
    expect(hasStaffAdminRole(undefined)).toBe(false)
    expect(hasRole(["RESEARCHER", "ADMIN"], "RESEARCHER")).toBe(true)
  })

  it("matches users holding a staff admin role, including ones also holding other roles", () => {
    expect(staffAdminUsersWhere()).toEqual({ roles: { hasSome: ["ADMIN", "SUPERADMIN"] } })
  })

  it("starts a session as the highest role the account holds", () => {
    expect(pickInitialRole(["RESEARCHER"])).toBe("RESEARCHER")
    expect(pickInitialRole(["PARTICIPANT"])).toBe("PARTICIPANT")
    expect(pickInitialRole(["RESEARCHER", "ADMIN"])).toBe("ADMIN")
    expect(pickInitialRole(["ADMIN", "RESEARCHER"])).toBe("ADMIN")
    expect(pickInitialRole(["SUPERADMIN"])).toBe("SUPERADMIN")
    expect(() => pickInitialRole([])).toThrow("User has no roles")
  })

  describe("role switch", () => {
    it("offers the other role only to accounts holding both", () => {
      expect(getSwitchTargetRole(["RESEARCHER", "ADMIN"], "ADMIN")).toBe("RESEARCHER")
      expect(getSwitchTargetRole(["RESEARCHER", "ADMIN"], "RESEARCHER")).toBe("ADMIN")
      expect(getSwitchTargetRole(["ADMIN"], "ADMIN")).toBeNull()
      expect(getSwitchTargetRole(["RESEARCHER"], "RESEARCHER")).toBeNull()
      expect(getSwitchTargetRole(["PARTICIPANT"], "PARTICIPANT")).toBeNull()
      expect(getSwitchTargetRole(["SUPERADMIN"], "SUPERADMIN")).toBeNull()
    })

    it("only allows switching to a held role that is not already in use", () => {
      expect(canSwitchToRole(["RESEARCHER", "ADMIN"], "ADMIN", "RESEARCHER")).toBe(true)
      expect(canSwitchToRole(["RESEARCHER", "ADMIN"], "ADMIN", "ADMIN")).toBe(false)
      expect(canSwitchToRole(["RESEARCHER"], "RESEARCHER", "ADMIN")).toBe(false)
    })
  })

  describe("admin invite eligibility", () => {
    it("lets a new email sign up and an existing researcher accept", () => {
      expect(getAdminInviteEligibility(null)).toEqual({ eligible: true, kind: "new-account" })
      expect(getAdminInviteEligibility([])).toEqual({ eligible: true, kind: "new-account" })
      expect(getAdminInviteEligibility(["RESEARCHER"])).toEqual({
        eligible: true,
        kind: "existing-researcher",
      })
    })

    it("never promotes participants", () => {
      expect(getAdminInviteEligibility(["PARTICIPANT"])).toEqual({
        eligible: false,
        reason: "participant",
      })
    })

    it("has nothing to grant to existing admins, even ones who are also researchers", () => {
      for (const roles of [["ADMIN"], ["SUPERADMIN"], ["RESEARCHER", "ADMIN"]] as const) {
        expect(getAdminInviteEligibility(roles)).toEqual({
          eligible: false,
          reason: "already-admin",
        })
      }
    })

    it("tells the superadmin to use a different address for participants", () => {
      const message = describeAdminInviteIneligibility("participant")
      expect(message).toMatch(/participants cannot be promoted/i)
      expect(message).toMatch(/\+admin@/)
    })
  })
})
