import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getServiceAccountToken, clearTokenCache } from "./tokenBroker"
import * as createJatosUserTokenModule from "./client/createJatosUserToken"
import * as dbModule from "db"

vi.mock("db", () => ({
  default: {
    systemConfig: {
      findUnique: vi.fn(),
    },
  },
}))

describe("tokenBroker", () => {
  beforeEach(() => {
    clearTokenCache()
    vi.useFakeTimers()
    vi.mocked(dbModule.default.systemConfig.findUnique).mockResolvedValue({
      id: 1,
      key: "jatosServiceUserID",
      value: "42",
    })

    process.env.JATOS_TOKEN = "admin-token"
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("generates a new token if not in cache", async () => {
    const createSpy = vi
      .spyOn(createJatosUserTokenModule, "createJatosUserToken")
      .mockResolvedValueOnce({ id: 1, token: "new-token" })

    const token = await getServiceAccountToken()

    expect(token).toBe("new-token")
    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(createSpy).toHaveBeenCalledWith(
      { jatosUserId: 42, userId: "service-account" },
      expect.objectContaining({ token: "admin-token" })
    )
  })

  it("returns cached token if not expired", async () => {
    const createSpy = vi
      .spyOn(createJatosUserTokenModule, "createJatosUserToken")
      .mockResolvedValueOnce({ id: 1, token: "cached-token" })

    await getServiceAccountToken()
    vi.advanceTimersByTime(30 * 60 * 1000)
    const token2 = await getServiceAccountToken()

    expect(token2).toBe("cached-token")
    expect(createSpy).toHaveBeenCalledTimes(1)
  })

  it("generates a new token if cached token is expired (past 55 mins)", async () => {
    const createSpy = vi
      .spyOn(createJatosUserTokenModule, "createJatosUserToken")
      .mockResolvedValueOnce({ id: 1, token: "first-token" })
      .mockResolvedValueOnce({ id: 2, token: "second-token" })

    await getServiceAccountToken()
    vi.advanceTimersByTime(56 * 60 * 1000)
    const token2 = await getServiceAccountToken()

    expect(token2).toBe("second-token")
    expect(createSpy).toHaveBeenCalledTimes(2)
  })

  it("prevents duplicate concurrent refresh for the same jatosUserId", async () => {
    let resolveToken!: (value: { id: number; token: string }) => void
    const tokenPromise = new Promise<{ id: number; token: string }>((r) => {
      resolveToken = r
    })
    const createSpy = vi
      .spyOn(createJatosUserTokenModule, "createJatosUserToken")
      .mockReturnValue(tokenPromise)

    const promise1 = getServiceAccountToken()
    const promise2 = getServiceAccountToken()
    const promise3 = getServiceAccountToken()

    resolveToken({ id: 1, token: "single-token" })

    const [token1, token2, token3] = await Promise.all([promise1, promise2, promise3])

    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(token1).toBe("single-token")
    expect(token2).toBe("single-token")
    expect(token3).toBe("single-token")
  })
})
