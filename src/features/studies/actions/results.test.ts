import { beforeEach, describe, expect, it, vi } from "vitest"
import { JatosForbiddenError } from "@/src/lib/jatos/errors"

const mocks = vi.hoisted(() => ({
  getBlitzContext: vi.fn(),
  getEnrichedResultsForResearcher: vi.fn(),
  downloadAllResultsForResearcher: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({
  getBlitzContext: mocks.getBlitzContext,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/src/lib/jatos/jatosAccessService", () => ({
  getEnrichedResultsForResearcher: mocks.getEnrichedResultsForResearcher,
  downloadAllResultsForResearcher: mocks.downloadAllResultsForResearcher,
}))

import { refetchEnrichedResultsAction } from "./results"

describe("refetchEnrichedResultsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not fetch raw results when the user is not authenticated", async () => {
    mocks.getBlitzContext.mockResolvedValue({ session: { userId: null } })

    const result = await refetchEnrichedResultsAction({ studyId: 3, jatosStudyId: 7 })

    expect(result).toEqual({ success: false, error: "Not authenticated" })
    expect(mocks.getEnrichedResultsForResearcher).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it("passes both platform study ID and JATOS study ID to the authorized service", async () => {
    const enrichedResults = [{ id: 11, componentResults: [] }]
    mocks.getBlitzContext.mockResolvedValue({ session: { userId: 42 } })
    mocks.getEnrichedResultsForResearcher.mockResolvedValue(enrichedResults)

    const result = await refetchEnrichedResultsAction({ studyId: 3, jatosStudyId: 7 })

    expect(mocks.getEnrichedResultsForResearcher).toHaveBeenCalledWith({
      studyId: 3,
      userId: 42,
      jatosStudyId: 7,
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/studies/3")
    expect(result).toEqual({ success: true, data: { enrichedResults } })
  })

  it("uses the structured JATOS error mapper for user-facing errors", async () => {
    mocks.getBlitzContext.mockResolvedValue({ session: { userId: 42 } })
    mocks.getEnrichedResultsForResearcher.mockRejectedValue(
      new JatosForbiddenError("raw JATOS permission detail")
    )

    const result = await refetchEnrichedResultsAction({ studyId: 3, jatosStudyId: 7 })

    expect(result).toEqual({
      success: false,
      error: "You don't have permission for this action.",
    })
  })
})
