import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fetchStudyCodes } from "./fetchStudyCodes"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("fetchStudyCodes", () => {
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
      text: async () => JSON.stringify({ data: ["code-1"] }),
    })

    await fetchStudyCodes({ studyId: "123", type: "gs" }, { token: "custom-token-xyz" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers.Authorization).toBe("Bearer custom-token-xyz")
  })

  it("falls back to JATOS_TOKEN when token option not provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: ["code-1"] }),
    })

    await fetchStudyCodes({ studyId: "123", type: "gs" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers.Authorization).toBe("Bearer env-token-456")
  })
})
