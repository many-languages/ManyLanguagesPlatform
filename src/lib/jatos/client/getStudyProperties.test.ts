import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getStudyProperties } from "./getStudyProperties"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("getStudyProperties", () => {
  const originalJatosBase = process.env.JATOS_BASE
  const originalJatosToken = process.env.JATOS_TOKEN

  beforeEach(() => {
    vi.resetAllMocks()
    process.env.JATOS_BASE = "http://jatos.test"
    process.env.JATOS_TOKEN = "env-token-456"
  })

  afterEach(() => {
    process.env.JATOS_BASE = originalJatosBase
    process.env.JATOS_TOKEN = originalJatosToken
  })

  it("uses passed token when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: { uuid: "study-1", title: "Test" } }),
    })

    await getStudyProperties("123", { token: "custom-token-xyz" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers.Authorization).toBe("Bearer custom-token-xyz")
  })

  it("throws when auth.token is missing", async () => {
    await expect(getStudyProperties("123", { token: "" })).rejects.toThrow(
      "Missing JATOS_BASE or auth.token"
    )
  })
})
