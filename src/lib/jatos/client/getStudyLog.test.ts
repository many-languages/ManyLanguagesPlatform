import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { JatosApiError, JatosTransportError } from "../errors"
import { getStudyLog } from "./getStudyLog"

const mockFetch = vi.fn()
global.fetch = mockFetch

const startEntry = {
  msg: "Started study run with Personal Single worker",
  batchId: 2,
  studyCode: "abc123",
  workerId: 9,
  timestamp: 1793801721049,
}

describe("getStudyLog", () => {
  const originalJatosBase = process.env.JATOS_BASE

  beforeEach(() => {
    vi.resetAllMocks()
    process.env.JATOS_BASE = "http://jatos.test"
  })

  afterEach(() => {
    process.env.JATOS_BASE = originalJatosBase
  })

  it("requests the log without download and sends the bearer token", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify([startEntry]) })

    await getStudyLog({ studyId: 12 }, { token: "tok" })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("http://jatos.test/jatos/api/v1/studies/12/log?download=false")
    expect(options.method).toBe("GET")
    expect(options.headers.Authorization).toBe("Bearer tok")
  })

  it("passes entryLimit through", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "[]" })

    await getStudyLog({ studyId: 12, entryLimit: 50 }, { token: "tok" })

    expect(mockFetch.mock.calls[0][0]).toContain("entryLimit=50")
  })

  it("returns entries and keeps unknown fields", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify([
          startEntry,
          { msg: "Exported results (files and/or data)", userName: "x" },
        ]),
    })

    const result = await getStudyLog({ studyId: 12 }, { token: "tok" })

    expect(result.truncated).toBe(false)
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]).toMatchObject({ studyCode: "abc123", workerId: 9 })
    expect(result.entries[1]).toMatchObject({ userName: "x" })
  })

  it("drops the 'Log is cut here' marker and reports truncation", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify([startEntry, "--- Log is cut here. Download it to get the whole file. ---"]),
    })

    const result = await getStudyLog({ studyId: 12, entryLimit: 1 }, { token: "tok" })

    expect(result.truncated).toBe(true)
    expect(result.entries).toEqual([startEntry])
  })

  it("accepts newline-delimited JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `${JSON.stringify(startEntry)}\n${JSON.stringify({ msg: "other" })}\n`,
    })

    const result = await getStudyLog({ studyId: 12 }, { token: "tok" })

    expect(result.entries.map((entry) => entry.msg)).toEqual([startEntry.msg, "other"])
  })

  it("throws when auth.token is missing", async () => {
    await expect(getStudyLog({ studyId: 12 }, { token: "" })).rejects.toThrow(
      "Missing JATOS_BASE or auth.token"
    )
  })

  it("throws JatosTransportError on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("offline"))

    await expect(getStudyLog({ studyId: 12 }, { token: "tok" })).rejects.toThrow(
      JatosTransportError
    )
  })

  it("throws JatosApiError on a failed response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: async () => "boom",
      json: async () => {
        throw new Error("no json")
      },
    })

    await expect(getStudyLog({ studyId: 12 }, { token: "tok" })).rejects.toThrow(JatosApiError)
  })

  it("throws JatosTransportError when the body is not valid JSON", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "not json\n{" })

    await expect(getStudyLog({ studyId: 12 }, { token: "tok" })).rejects.toThrow(
      JatosTransportError
    )
  })

  it("throws JatosTransportError when entries lack a msg", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify([{ foo: 1 }]) })

    await expect(getStudyLog({ studyId: 12 }, { token: "tok" })).rejects.toThrow(
      JatosTransportError
    )
  })
})
