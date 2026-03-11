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

    const result = await createJatosUserToken({
      jatosUserId: 42,
      userId: "user-abc",
    })

    expect(result).toEqual({ id: 101, token: "jatos-token-secret-xyz" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("http://jatos.test/jatos/api/v1/users/42/tokens")
    expect(options.method).toBe("POST")
    expect(options.headers.Authorization).toBe("Bearer admin-token-123")

    const body = JSON.parse(options.body)
    expect(body.name).toBe("mlp-researcher-user-abc")
  })

  it("throws error if JATOS_TOKEN is missing", async () => {
    delete process.env.JATOS_TOKEN
    await expect(createJatosUserToken({ jatosUserId: 42, userId: "user-abc" })).rejects.toThrow(
      "Missing JATOS_BASE or JATOS_TOKEN environment variables."
    )
  })

  it("throws error on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => JSON.stringify({ error: "Invalid user" }),
    })

    await expect(createJatosUserToken({ jatosUserId: 42, userId: "user-abc" })).rejects.toThrow(
      "Failed to create JATOS user token (400): Invalid user"
    )
  })

  it("throws error on invalid JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "Not JSON",
    })

    await expect(createJatosUserToken({ jatosUserId: 42, userId: "user-abc" })).rejects.toThrow(
      "JATOS response is not valid JSON"
    )
  })

  it("throws error if response is missing id or token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: { id: 101 } }), // missing token
    })

    await expect(createJatosUserToken({ jatosUserId: 42, userId: "user-abc" })).rejects.toThrow(
      "JATOS response missing 'data.id' or 'data.token'"
    )
  })
})
