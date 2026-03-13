import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createJatosUserToken } from "./createJatosUserToken"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("createJatosUserToken", () => {
  const originalJatosBase = process.env.JATOS_BASE
  const originalJatosToken = process.env.JATOS_TOKEN

  beforeEach(() => {
    vi.resetAllMocks()
    process.env.JATOS_BASE = "http://jatos.test"
    process.env.JATOS_TOKEN = "admin-token-123"
  })

  afterEach(() => {
    process.env.JATOS_BASE = originalJatosBase
    process.env.JATOS_TOKEN = originalJatosToken
  })

  it("creates a user token successfully and returns id and token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          data: {
            id: 101,
            token: "jatos-token-secret-xyz",
          },
        }),
    })

    const result = await createJatosUserToken(
      { jatosUserId: 42, userId: "user-abc" },
      { token: "admin-token-123" }
    )

    expect(result).toEqual({ id: 101, token: "jatos-token-secret-xyz" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("http://jatos.test/jatos/api/v1/users/42/tokens")
    expect(options.method).toBe("POST")
    expect(options.headers.Authorization).toBe("Bearer admin-token-123")

    const body = JSON.parse(options.body)
    expect(body.name).toBe("mlp-researcher-user-abc")
  })

  it("throws error if auth.token is missing", async () => {
    await expect(
      createJatosUserToken({ jatosUserId: 42, userId: "user-abc" }, { token: "" })
    ).rejects.toThrow("Missing JATOS_BASE or auth.token")
  })

  it("throws JatosBadRequestError on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () =>
        JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Invalid user" } }),
    })

    const { JatosBadRequestError } = await import("../errors")
    await expect(
      createJatosUserToken({ jatosUserId: 42, userId: "user-abc" }, { token: "admin-token-123" })
    ).rejects.toThrow(JatosBadRequestError)
  })

  it("throws JatosTransportError on invalid JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "Not JSON",
    })

    const { JatosTransportError } = await import("../errors")
    await expect(
      createJatosUserToken({ jatosUserId: 42, userId: "user-abc" }, { token: "admin-token-123" })
    ).rejects.toThrow(JatosTransportError)
  })

  it("throws JatosTransportError if response is missing id or token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: { id: 101 } }), // missing token
    })

    const { JatosTransportError } = await import("../errors")
    await expect(
      createJatosUserToken({ jatosUserId: 42, userId: "user-abc" }, { token: "admin-token-123" })
    ).rejects.toThrow(JatosTransportError)
  })
})
