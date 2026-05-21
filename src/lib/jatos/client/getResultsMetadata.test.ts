import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { JatosTransportError } from "../errors"
import { getResultsMetadata } from "./getResultsMetadata"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("getResultsMetadata", () => {
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
      json: async () => ({ data: [] }),
    })

    await getResultsMetadata({ studyIds: [1] }, { token: "custom-token-xyz" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers.Authorization).toBe("Bearer custom-token-xyz")
  })

  it("throws when auth.token is missing", async () => {
    await expect(getResultsMetadata({ studyIds: [1] }, { token: "" })).rejects.toThrow(
      "Missing JATOS_BASE or auth.token"
    )
  })

  it("returns validated results metadata", async () => {
    const metadata = {
      apiVersion: "1.1",
      data: [
        {
          studyId: 10,
          studyUuid: "study-uuid",
          studyTitle: "Study",
          studyResults: [
            {
              id: 20,
              uuid: "result-uuid",
              studyCode: "code-1",
              startDate: 1,
              endDate: 2,
              duration: "1s",
              lastSeenDate: 2,
              studyState: "FINISHED",
              workerId: 30,
              workerType: "PersonalSingle",
              batchId: 40,
              batchUuid: "batch-uuid",
              batchTitle: "Default",
              componentResults: [
                {
                  id: 50,
                  componentId: 60,
                  componentUuid: "component-uuid",
                  startDate: 1,
                  endDate: 2,
                  duration: "1s",
                  componentState: "FINISHED",
                  path: "index.html",
                  data: { size: 10, sizeHumanReadable: "10 B" },
                  files: [{ filename: "data.txt", size: 10, sizeHumanReadable: "10 B" }],
                },
              ],
            },
          ],
        },
      ],
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => metadata,
    })

    await expect(getResultsMetadata({ studyIds: [10] }, { token: "token" })).resolves.toEqual(
      metadata
    )
  })

  it("throws JatosTransportError when metadata shape is invalid", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ studyId: "10", studyResults: [] }] }),
    })

    await expect(getResultsMetadata({ studyIds: [10] }, { token: "token" })).rejects.toThrow(
      JatosTransportError
    )
  })
})
