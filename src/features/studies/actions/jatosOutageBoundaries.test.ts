import { beforeEach, describe, expect, it, vi } from "vitest"
import { JatosTransportError } from "@/src/lib/jatos/errors"

const mocks = vi.hoisted(() => ({
  getBlitzContext: vi.fn(),
  checkPilotStatusForResearcher: vi.fn(),
  downloadAllResultsForResearcher: vi.fn(),
  importJatosStudyForResearcher: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({
  getBlitzContext: mocks.getBlitzContext,
}))

vi.mock("@/src/lib/jatos/jatosAccessService", () => ({
  checkPilotStatusForResearcher: mocks.checkPilotStatusForResearcher,
  downloadAllResultsForResearcher: mocks.downloadAllResultsForResearcher,
}))

vi.mock("@/src/lib/jatos/provisioning/importJatosStudy", () => ({
  importJatosStudyForResearcher: mocks.importJatosStudyForResearcher,
}))

vi.mock("../server/studySetupWrites", () => ({
  applySetupCompletionFlags: vi.fn(),
}))

import { POST as importJatosStudyRoute } from "@/src/app/api/jatos/import/route"
import { checkPilotStatusAction } from "./checkPilotStatus"
import { downloadResultsAction } from "./results"

function outage(operation: string) {
  return new JatosTransportError(
    "connect ECONNREFUSED http://jatos.internal:9000 Authorization: Bearer secret-token",
    operation
  )
}

function session(userId = 42) {
  mocks.getBlitzContext.mockResolvedValue({
    session: {
      userId,
      role: "RESEARCHER",
      $authorize: vi.fn(),
    },
  })
}

function mockJzipFile(name = "study.jzip") {
  return Object.assign(new Blob(["jatos"], { type: "application/octet-stream" }), { name })
}

describe("JATOS outage user-facing boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    session()
  })

  it("setup pilot status returns a controlled safe error on JATOS outage", async () => {
    mocks.checkPilotStatusForResearcher.mockRejectedValue(outage("checkPilotStatus"))

    const result = await checkPilotStatusAction({
      studyId: 7,
      jatosStudyUUID: "study-uuid",
      jatosStudyUploadId: 11,
    })

    expect(result).toEqual({
      success: false,
      completed: null,
      error: "Something went wrong. Please try again.",
    })
    expect(JSON.stringify(result)).not.toContain("secret-token")
    expect(JSON.stringify(result)).not.toContain("jatos.internal")
  })

  it("raw results download returns a controlled safe error on JATOS outage", async () => {
    mocks.downloadAllResultsForResearcher.mockRejectedValue(outage("downloadResults"))

    const result = await downloadResultsAction(7)

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    })
    expect(JSON.stringify(result)).not.toContain("secret-token")
    expect(JSON.stringify(result)).not.toContain("jatos.internal")
  })

  it("JATOS import route returns jatos-kind safe JSON on JATOS outage", async () => {
    mocks.importJatosStudyForResearcher.mockRejectedValue(outage("importStudy"))

    const form = new FormData()
    form.append("studyId", "7")
    form.append("jatosWorkerType", "SINGLE")
    form.append("studyFile", mockJzipFile(), "study.jzip")

    const response = await importJatosStudyRoute(
      new Request("http://app.test/api/jatos/import", {
        method: "POST",
        body: form,
      })
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({
      error: "Something went wrong. Please try again.",
      kind: "jatos",
    })
    expect(JSON.stringify(body)).not.toContain("secret-token")
    expect(JSON.stringify(body)).not.toContain("jatos.internal")
  })
})
