import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getBlitzContext: vi.fn(),
  checkPilotStatusForResearcher: vi.fn(),
  applySetupCompletionFlags: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({
  getBlitzContext: mocks.getBlitzContext,
}))

vi.mock("@/src/lib/jatos/jatosAccessService", () => ({
  checkPilotStatusForResearcher: mocks.checkPilotStatusForResearcher,
}))

vi.mock("../server/studySetupWrites", () => ({
  applySetupCompletionFlags: mocks.applySetupCompletionFlags,
}))

import { checkPilotStatusAction } from "./checkPilotStatus"

describe("checkPilotStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects invalid input before checking JATOS", async () => {
    const result = await checkPilotStatusAction({ studyId: -1 })

    expect(result).toEqual({
      success: false,
      completed: null,
      error: "Invalid pilot status input",
    })
    expect(mocks.checkPilotStatusForResearcher).not.toHaveBeenCalled()
    expect(mocks.applySetupCompletionFlags).not.toHaveBeenCalled()
  })

  it("does not mark step 3 complete when JATOS reports no completed pilot", async () => {
    mocks.getBlitzContext.mockResolvedValue({ session: { userId: 42 } })
    mocks.checkPilotStatusForResearcher.mockResolvedValue({
      success: true,
      completed: false,
    })

    const result = await checkPilotStatusAction({
      studyId: 3,
      jatosStudyUUID: "study-uuid",
      jatosStudyUploadId: 8,
    })

    expect(mocks.checkPilotStatusForResearcher).toHaveBeenCalledWith({
      studyId: 3,
      userId: 42,
      jatosStudyUUID: "study-uuid",
      jatosStudyUploadId: 8,
    })
    expect(mocks.applySetupCompletionFlags).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true, completed: false })
  })

  it("marks step 3 complete only after JATOS confirms pilot completion", async () => {
    mocks.getBlitzContext.mockResolvedValue({ session: { userId: 42 } })
    mocks.checkPilotStatusForResearcher.mockResolvedValue({
      success: true,
      completed: true,
    })

    const result = await checkPilotStatusAction({
      studyId: 3,
      jatosStudyUUID: "study-uuid",
      jatosStudyUploadId: 8,
    })

    expect(mocks.applySetupCompletionFlags).toHaveBeenCalledWith({
      studyId: 3,
      step3Completed: true,
    })
    expect(result).toEqual({ success: true, completed: true })
  })
})
