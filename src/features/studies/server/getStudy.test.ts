import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthorizedSession: vi.fn(),
  studyFindUnique: vi.fn(),
  studyResearcherFindFirst: vi.fn(),
  participantStudyFindUnique: vi.fn(),
}))

vi.mock("@/src/lib/auth/session", () => ({
  getAuthorizedSession: mocks.getAuthorizedSession,
}))

vi.mock("db", async () => {
  const { Prisma } = await import("@prisma/client")
  return {
    Prisma,
    default: {
      study: {
        findUnique: mocks.studyFindUnique,
      },
      studyResearcher: {
        findFirst: mocks.studyResearcherFindFirst,
      },
      participantStudy: {
        findUnique: mocks.participantStudyFindUnique,
      },
    },
  }
})

import { getStudyPageRsc, getStudyRsc } from "./getStudy"

const openStudyOverview = {
  id: 11,
  title: "Open study",
  description: "Public description",
  status: "OPEN",
  startDate: null,
  endDate: null,
  sampleSize: 10,
  payment: "10 EUR",
  length: "20 minutes",
  archived: false,
  jatosStudyUploads: [
    {
      jatosStudyId: 101,
      jatosWorkerType: "SINGLE",
      step1Completed: true,
      step2Completed: true,
      step3Completed: true,
      step4Completed: true,
      step5Completed: true,
      step6Completed: true,
    },
  ],
}

const researcherStudy = {
  ...openStudyOverview,
  jatosStudyUUID: "internal-jatos-uuid",
  adminApproved: true,
  adminReviewedAt: null,
  adminReviewedById: null,
  archivedAt: null,
  archivedById: null,
  jatosStudyUploads: [
    {
      ...openStudyOverview.jatosStudyUploads[0],
      id: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      studyId: 12,
      versionNumber: 1,
      jatosFileName: "study.zip",
      jatosComponentId: 2,
      jatosComponentUUID: "component-uuid",
      jatosBatchId: 3,
      buildHash: "hash",
      hashAlgorithm: "sha256",
      approvedExtractionId: null,
      pilotLinks: [],
      approvedExtraction: null,
    },
  ],
  researchers: [{ id: 1, userId: 42, role: "PI" }],
  participations: [],
  FeedbackTemplate: null,
}

describe("study read boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthorizedSession.mockResolvedValue({ userId: 42, role: "PARTICIPANT" })
    mocks.studyResearcherFindFirst.mockResolvedValue(null)
    mocks.participantStudyFindUnique.mockResolvedValue(null)
  })

  it("loads public/open study pages through the narrow participant overview shape", async () => {
    mocks.studyFindUnique.mockResolvedValue(openStudyOverview)

    const result = await getStudyPageRsc(11)

    expect(result).toEqual({
      kind: "participant",
      study: {
        ...openStudyOverview,
        latestJatosStudyUpload: openStudyOverview.jatosStudyUploads[0],
      },
    })
    expect(mocks.studyFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        select: expect.not.objectContaining({
          researchers: expect.anything(),
          participations: expect.anything(),
          jatosStudyUUID: expect.anything(),
          adminReviewedById: expect.anything(),
        }),
      })
    )
  })

  it("keeps legacy getStudyRsc on the narrow overview shape", async () => {
    mocks.studyFindUnique.mockResolvedValue(openStudyOverview)

    const study = await getStudyRsc(13)

    expect(study).toEqual({
      ...openStudyOverview,
      latestJatosStudyUpload: openStudyOverview.jatosStudyUploads[0],
    })
    expect(mocks.studyFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 13 },
        select: expect.not.objectContaining({
          researchers: expect.anything(),
          participations: expect.anything(),
          jatosStudyUUID: expect.anything(),
        }),
      })
    )
  })

  it("loads the broad management shape only for researchers on the study", async () => {
    mocks.getAuthorizedSession.mockResolvedValue({ userId: 42, role: "RESEARCHER" })
    mocks.studyResearcherFindFirst.mockResolvedValue({ id: 1 })
    mocks.studyFindUnique.mockResolvedValue(researcherStudy)

    const result = await getStudyPageRsc(12)

    expect(result.kind).toBe("researcher")
    expect(result.study.latestJatosStudyUpload).toEqual(researcherStudy.jatosStudyUploads[0])
    expect(mocks.studyFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 12 },
        select: expect.objectContaining({
          researchers: expect.anything(),
          participations: expect.anything(),
          jatosStudyUUID: true,
        }),
      })
    )
  })
})
