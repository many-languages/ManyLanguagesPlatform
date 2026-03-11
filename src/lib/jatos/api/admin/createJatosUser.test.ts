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

    const result = await createJatosUser({
      username: "mlp-researcher-1",
      name: "MLP Researcher 1",
    })

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

  it("throws error if JATOS_TOKEN is missing", async () => {
    delete process.env.JATOS_TOKEN
    await expect(createJatosUser({ username: "test", name: "test" })).rejects.toThrow(
      "Missing JATOS_BASE or JATOS_TOKEN environment variables."
    )
  })

  it("throws error on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => JSON.stringify({ error: "Username already exists" }),
    })

    await expect(createJatosUser({ username: "test", name: "test" })).rejects.toThrow(
      "Failed to create JATOS user (400): Username already exists"
    )
  })

  it("throws error on invalid JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "Not JSON",
    })

    await expect(createJatosUser({ username: "test", name: "test" })).rejects.toThrow(
      "JATOS response is not valid JSON"
    )
  })

  it("throws error if response is missing id or username", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: { id: 42 } }), // missing username
    })

    await expect(createJatosUser({ username: "test", name: "test" })).rejects.toThrow(
      "JATOS response missing 'data.id' or 'data.username'"
    )
  })
})
