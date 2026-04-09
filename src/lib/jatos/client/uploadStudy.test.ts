import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { uploadStudy } from "./uploadStudy"

const mockFetch = vi.fn()
global.fetch = mockFetch

function createTestFile(name = "study.jzip", content = "zip-content"): File {
  const blob = new Blob([content], { type: "application/zip" })
  Object.defineProperty(blob, "name", { value: name, writable: false })
  return blob as unknown as File
}

describe("uploadStudy", () => {
  const originalJatosBase = process.env.JATOS_BASE

  beforeEach(() => {
    vi.resetAllMocks()
    process.env.JATOS_BASE = "http://jatos.test"
  })

  afterEach(() => {
    process.env.JATOS_BASE = originalJatosBase
  })

  it("uploads file and returns id, uuid, title", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          data: { id: 42, uuid: "study-uuid-123", title: "Test Study" },
        }),
    })

    const file = createTestFile()
    const result = await uploadStudy(file, { token: "admin-token-xyz" })

    expect(result).toEqual({ id: 42, uuid: "study-uuid-123", title: "Test Study" })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("http://jatos.test/jatos/api/v1/studies")
    expect(options.method).toBe("POST")
    expect(options.headers.Authorization).toBe("Bearer admin-token-xyz")
    expect(options.headers.accept).toBe("application/json")
    expect(options.body).toBeInstanceOf(FormData)
  })

  it("throws when auth.token is missing", async () => {
    const file = createTestFile()
    await expect(uploadStudy(file, { token: "" })).rejects.toThrow(
      "Missing JATOS_BASE or auth.token"
    )
  })

  it("throws JatosTransportError on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))
    const file = createTestFile()

    const { JatosTransportError } = await import("../errors")
    await expect(uploadStudy(file, { token: "admin-token" })).rejects.toThrow(JatosTransportError)
  })

  it("throws JatosApiError on 401 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => JSON.stringify({ error: { message: "Invalid token" } }),
    })
    const file = createTestFile()

    const { JatosUnauthorizedError } = await import("../errors")
    await expect(uploadStudy(file, { token: "bad-token" })).rejects.toThrow(JatosUnauthorizedError)
  })

  it("throws JatosTransportError on invalid JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "Not valid JSON",
    })
    const file = createTestFile()

    const { JatosTransportError } = await import("../errors")
    await expect(uploadStudy(file, { token: "admin-token" })).rejects.toThrow(JatosTransportError)
  })

  it("throws JatosTransportError when response missing id or uuid", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: {} }),
    })
    const file = createTestFile()

    const { JatosTransportError } = await import("../errors")
    await expect(uploadStudy(file, { token: "admin-token" })).rejects.toThrow(JatosTransportError)
  })
})
