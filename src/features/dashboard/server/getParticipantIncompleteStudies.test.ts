import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireDashboardUser: vi.fn(),
  participantStudyFindMany: vi.fn(),
  getResultsMetadataForParticipantDashboard: vi.fn(),
}))

vi.mock("./auth", () => ({
  requireDashboardUser: mocks.requireDashboardUser,
}))

vi.mock("db", () => ({
  default: {
    participantStudy: {
      findMany: mocks.participantStudyFindMany,
    },
  },
}))

vi.mock("@/src/lib/jatos/jatosAccessService", () => ({
  getResultsMetadataForParticipantDashboard: mocks.getResultsMetadataForParticipantDashboard,
}))

import { getParticipantIncompleteStudies } from "./getParticipantIncompleteStudies"

describe("getParticipantIncompleteStudies", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireDashboardUser.mockResolvedValue(42)
    mocks.getResultsMetadataForParticipantDashboard.mockResolvedValue(null)
  })

  it("filters by the authenticated participant and does not expose personal run URLs", async () => {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 3)
    mocks.participantStudyFindMany.mockResolvedValue([
      {
        id: 7,
        pseudonym: "participant-42",
        jatosRunUrl: "https://jatos.example/run/personal-secret-link",
        study: {
          id: 11,
          title: "Study to complete",
          endDate,
          jatosStudyUploads: [{ jatosStudyId: 101 }],
        },
      },
    ])

    const result = await getParticipantIncompleteStudies()

    expect(mocks.requireDashboardUser).toHaveBeenCalledWith("PARTICIPANT")
    expect(mocks.participantStudyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 42 }),
        select: expect.not.objectContaining({ jatosRunUrl: true }),
      })
    )
    expect(JSON.stringify(result)).not.toContain("personal-secret-link")
    expect(result.nearingDeadline[0]).toEqual(
      expect.not.objectContaining({ jatosRunUrl: expect.anything() })
    )
  })
})
