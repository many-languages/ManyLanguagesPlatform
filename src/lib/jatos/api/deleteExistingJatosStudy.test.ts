import { describe, it, expect, vi, beforeEach } from "vitest"
import deleteExistingJatosStudy from "./deleteExistingJatosStudy"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("deleteExistingJatosStudy", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("passes token in Authorization header when provided", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    await deleteExistingJatosStudy("study-123", { token: "custom-token-xyz" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain("/api/jatos/delete-study")
    expect(options?.headers?.Authorization).toBe("Bearer custom-token-xyz")
  })

  it("does not add Authorization header when token not provided", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    await deleteExistingJatosStudy("study-123")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]
    expect(options?.headers?.Authorization).toBeUndefined()
  })
})
