import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getResultsData } from "./getResultsData"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("getResultsData", () => {
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
      arrayBuffer: async () => new ArrayBuffer(0),
      headers: { get: () => "application/zip" },
    })

    await getResultsData({ studyIds: [1] }, { token: "custom-token-xyz" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers.Authorization).toBe("Bearer custom-token-xyz")
  })

  it("throws when auth.token is missing", async () => {
    await expect(getResultsData({ studyIds: [1] }, { token: "" })).rejects.toThrow(
      "Missing JATOS_BASE or auth.token"
    )
  })
})
