import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getOrGenerateJatosToken, clearTokenCache } from "./tokenCache"
import * as createJatosUserTokenModule from "./api/admin/createJatosUserToken"

describe("tokenCache", () => {
  beforeEach(() => {
    clearTokenCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("generates a new token if not in cache", async () => {
    const createSpy = vi
      .spyOn(createJatosUserTokenModule, "createJatosUserToken")
      .mockResolvedValueOnce({ id: 1, token: "new-token" })

    const token = await getOrGenerateJatosToken(42, "user-1")

    expect(token).toBe("new-token")
    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(createSpy).toHaveBeenCalledWith({ jatosUserId: 42, userId: "user-1" })
  })

  it("returns cached token if not expired", async () => {
    const createSpy = vi
      .spyOn(createJatosUserTokenModule, "createJatosUserToken")
      .mockResolvedValueOnce({ id: 1, token: "cached-token" })

    // First call generates
    await getOrGenerateJatosToken(42, "user-1")

    // Advance time by 30 minutes
    vi.advanceTimersByTime(30 * 60 * 1000)

    // Second call should return cached
    const token2 = await getOrGenerateJatosToken(42, "user-1")

    expect(token2).toBe("cached-token")
    expect(createSpy).toHaveBeenCalledTimes(1) // Still only 1 call
  })

  it("generates a new token if cached token is expired (past 55 mins)", async () => {
    const createSpy = vi
      .spyOn(createJatosUserTokenModule, "createJatosUserToken")
      .mockResolvedValueOnce({ id: 1, token: "first-token" })
      .mockResolvedValueOnce({ id: 2, token: "second-token" })

    // First call generates
    await getOrGenerateJatosToken(42, "user-1")

    // Advance time by 56 minutes (past the 55 min TTL)
    vi.advanceTimersByTime(56 * 60 * 1000)

    // Second call should generate new
    const token2 = await getOrGenerateJatosToken(42, "user-1")

    expect(token2).toBe("second-token")
    expect(createSpy).toHaveBeenCalledTimes(2)
  })
})
