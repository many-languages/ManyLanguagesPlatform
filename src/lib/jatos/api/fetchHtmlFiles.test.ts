import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchHtmlFiles } from "./fetchHtmlFiles"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("fetchHtmlFiles", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("passes token through to fetchStudyAssets when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { type: "folder", name: "root", content: [] } }),
    })

    await fetchHtmlFiles(123, { token: "custom-token-xyz" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]
    expect(options?.headers?.Authorization).toBe("Bearer custom-token-xyz")
  })
})
