/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { downloadBlob } from "./downloadBlob"

const mockFetch = vi.fn()
const mockCreateObjectURL = vi.fn(() => "blob:mock-url")
const mockRevokeObjectURL = vi.fn()

global.fetch = mockFetch
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

describe("downloadBlob", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCreateObjectURL.mockReturnValue("blob:mock-url")
  })

  it("passes token in Authorization header when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(),
    })

    await downloadBlob("/api/jatos/get-all-results", "results.zip", {
      token: "custom-token-xyz",
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("/api/jatos/get-all-results")
    expect(options?.headers?.Authorization).toBe("Bearer custom-token-xyz")
  })

  it("does not add Authorization header when token not provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(),
    })

    await downloadBlob("/api/jatos/get-all-results", "results.zip")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]
    expect(options?.headers?.Authorization).toBeUndefined()
  })
})
