import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createJatosUser } from "./createJatosUser"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("createJatosUser", () => {
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

  it("creates a user successfully and returns id and username", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          data: {
            id: 42,
            username: "mlp-researcher-1",
            name: "MLP Researcher 1",
          },
        }),
    })

    const result = await createJatosUser(
      {
        username: "mlp-researcher-1",
        name: "MLP Researcher 1",
      },
      { token: "admin-token-123" }
    )

    expect(result).toEqual({ id: 42, username: "mlp-researcher-1" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("http://jatos.test/jatos/api/v1/users")
    expect(options.method).toBe("POST")
    expect(options.headers.Authorization).toBe("Bearer admin-token-123")

    const body = JSON.parse(options.body)
    expect(body.username).toBe("mlp-researcher-1")
    expect(body.name).toBe("MLP Researcher 1")
    expect(body.authMethod).toBe("DB")
    expect(body.password).toBeDefined()
    expect(body.password.length).toBeGreaterThan(10)
  })

  it("throws error if auth.token is missing", async () => {
    await expect(
      createJatosUser({ username: "test", name: "test" }, { token: "" })
    ).rejects.toThrow("Missing JATOS_BASE or auth.token")
  })

  it("throws JatosBadRequestError on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () =>
        JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Username already exists" } }),
    })

    const { JatosBadRequestError } = await import("../errors")
    await expect(
      createJatosUser({ username: "test", name: "test" }, { token: "admin-token-123" })
    ).rejects.toThrow(JatosBadRequestError)
  })

  it("throws JatosTransportError on invalid JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "Not JSON",
    })

    const { JatosTransportError } = await import("../errors")
    await expect(
      createJatosUser({ username: "test", name: "test" }, { token: "admin-token-123" })
    ).rejects.toThrow(JatosTransportError)
  })

  it("throws JatosTransportError if response is missing id or username", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: { id: 42 } }), // missing username
    })

    const { JatosTransportError } = await import("../errors")
    await expect(
      createJatosUser({ username: "test", name: "test" }, { token: "admin-token-123" })
    ).rejects.toThrow(JatosTransportError)
  })
})
