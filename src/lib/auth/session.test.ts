import { describe, expect, it } from "vitest"
import { AuthorizationError } from "blitz"
import { getAuthorizedUserId } from "./session"

describe("getAuthorizedUserId", () => {
  it("returns userId when present", () => {
    expect(getAuthorizedUserId({ userId: 42 } as Parameters<typeof getAuthorizedUserId>[0])).toBe(
      42
    )
  })

  it("throws AuthorizationError when userId is null", () => {
    expect(() =>
      getAuthorizedUserId({ userId: null } as Parameters<typeof getAuthorizedUserId>[0])
    ).toThrow(AuthorizationError)
  })
})
