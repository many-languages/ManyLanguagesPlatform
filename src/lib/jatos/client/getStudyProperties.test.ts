import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { JatosTransportError } from "../errors"
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
      text: async () =>
        JSON.stringify({
          data: {
            id: 123,
            uuid: "study-1",
            title: "Test",
            dirName: "study-dir",
            active: true,
            locked: false,
            groupStudy: false,
            linearStudy: true,
            allowPreview: true,
          },
        }),
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

  it("returns validated study properties with batches", async () => {
    const properties = {
      id: 123,
      uuid: "study-1",
      title: "Test",
      dirName: "study-dir",
      active: true,
      locked: false,
      groupStudy: false,
      linearStudy: true,
      allowPreview: true,
      batches: [
        {
          id: 456,
          uuid: "batch-1",
          title: "Default",
          active: true,
          allowedWorkerTypes: ["PersonalSingle"],
        },
      ],
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ apiVersion: "1.1", data: properties }),
    })

    await expect(getStudyProperties("123", { token: "token" })).resolves.toEqual(properties)
  })

  it("throws JatosTransportError when study properties shape is invalid", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          data: {
            id: 123,
            uuid: "study-1",
            title: "Test",
            dirName: "study-dir",
            active: true,
            locked: false,
            groupStudy: false,
            linearStudy: true,
            allowPreview: true,
            batches: [{ id: "bad", uuid: "batch-1", title: "Default", active: true }],
          },
        }),
    })

    await expect(getStudyProperties("123", { token: "token" })).rejects.toThrow(JatosTransportError)
  })
})
