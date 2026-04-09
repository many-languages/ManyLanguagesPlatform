import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getAssetStructure } from "./getAssetStructure"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("getAssetStructure", () => {
  const originalJatosBase = process.env.JATOS_BASE

  beforeEach(() => {
    vi.resetAllMocks()
    process.env.JATOS_BASE = "http://jatos.test"
  })

  afterEach(() => {
    process.env.JATOS_BASE = originalJatosBase
  })

  it("fetches asset structure and returns response", async () => {
    const mockStructure = { data: { name: "root", children: [] } }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockStructure),
    })

    const result = await getAssetStructure(123, { token: "custom-token-xyz" })

    expect(result).toEqual(mockStructure)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("http://jatos.test/jatos/api/v1/studies/123/assets/structure")
    expect(options.method).toBe("GET")
    expect(options.headers.Authorization).toBe("Bearer custom-token-xyz")
  })

  it("throws when auth.token is missing", async () => {
    await expect(getAssetStructure(123, { token: "" })).rejects.toThrow(
      "Missing JATOS_BASE or auth.token"
    )
  })

  it("throws JatosTransportError on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const { JatosTransportError } = await import("../errors")
    await expect(getAssetStructure(123, { token: "token" })).rejects.toThrow(JatosTransportError)
  })

  it("throws JatosApiError on 404 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => JSON.stringify({ error: { message: "Study not found" } }),
    })

    const { JatosNotFoundError } = await import("../errors")
    await expect(getAssetStructure(999, { token: "token" })).rejects.toThrow(JatosNotFoundError)
  })

  it("throws JatosTransportError on invalid JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "Not valid JSON",
    })

    const { JatosTransportError } = await import("../errors")
    await expect(getAssetStructure(123, { token: "token" })).rejects.toThrow(JatosTransportError)
  })
})
