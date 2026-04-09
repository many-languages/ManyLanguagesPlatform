import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { addStudyMember } from "./addStudyMember"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("addStudyMember", () => {
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

  it("adds a member successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: {} }),
    })

    await addStudyMember({ studyId: 1, userId: 42 }, { token: "admin-token-123" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("http://jatos.test/jatos/api/v1/studies/1/members/42")
    expect(options.method).toBe("PUT")
    expect(options.headers.Authorization).toBe("Bearer admin-token-123")
  })

  it("accepts study UUID as studyId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: {} }),
    })

    await addStudyMember(
      {
        studyId: "abc-123-uuid",
        userId: 42,
      },
      { token: "admin-token-123" }
    )

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe("http://jatos.test/jatos/api/v1/studies/abc-123-uuid/members/42")
  })

  it("throws error if auth.token is missing", async () => {
    await expect(addStudyMember({ studyId: 1, userId: 42 }, { token: "" })).rejects.toThrow(
      "Missing JATOS_BASE or auth.token"
    )
  })

  it("throws JatosNotFoundError on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () =>
        JSON.stringify({ error: { code: "NOT_FOUND", message: "Study not found" } }),
    })

    const { JatosNotFoundError } = await import("../errors")
    await expect(
      addStudyMember({ studyId: 1, userId: 42 }, { token: "admin-token-123" })
    ).rejects.toThrow(JatosNotFoundError)
  })
})
