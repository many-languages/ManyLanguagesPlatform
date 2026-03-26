import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { updateJatosUserRole } from "./updateJatosUserRole"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("updateJatosUserRole", () => {
  const originalJatosBase = process.env.JATOS_BASE

  beforeEach(() => {
    vi.resetAllMocks()
    process.env.JATOS_BASE = "http://jatos.test"
  })

  afterEach(() => {
    process.env.JATOS_BASE = originalJatosBase
  })

  it("patches user role successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: { id: 2, username: "mlp-service-account" } }),
    })

    await updateJatosUserRole({ jatosUserId: 2, role: "VIEWER" }, { token: "admin-token-123" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("http://jatos.test/jatos/api/v1/users/2/roles")
    expect(options.method).toBe("PATCH")
    expect(options.headers.Authorization).toBe("Bearer admin-token-123")
    expect(options.headers["Content-Type"]).toBe("application/json")
    expect(JSON.parse(options.body)).toEqual({ role: "VIEWER" })
  })

  it("throws error if auth.token is missing", async () => {
    await expect(
      updateJatosUserRole({ jatosUserId: 2, role: "VIEWER" }, { token: "" })
    ).rejects.toThrow("Missing JATOS_BASE or auth.token")
  })
})
