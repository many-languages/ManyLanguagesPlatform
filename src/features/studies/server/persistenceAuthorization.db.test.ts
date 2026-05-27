import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import db, { type Study, type User } from "db"

const mocks = vi.hoisted(() => ({
  getBlitzContext: vi.fn(),
  notifyAdminsOfPendingStudyReview: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({
  getBlitzContext: mocks.getBlitzContext,
}))

vi.mock("@/src/features/notifications", () => ({
  notifyAdminsOfPendingStudyReview: mocks.notifyAdminsOfPendingStudyReview,
}))

import { saveFeedbackTemplateAction } from "@/src/features/feedback/actions/saveFeedbackTemplate"
import { updateVariableCodebookRsc } from "@/src/features/codebook/server/updateVariableCodebook"

const TEST_PREFIX = "persistence-auth-db-test"

function testEmail(name: string) {
  return `${TEST_PREFIX}-${name}@example.com`
}

function setSession(user: User) {
  mocks.getBlitzContext.mockResolvedValue({
    session: {
      userId: user.id,
      role: user.role,
      $authorize: vi.fn(),
    },
  })
}

async function createUser(name: string, role: User["role"]) {
  return db.user.create({
    data: {
      email: testEmail(`${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`),
      role,
    },
  })
}

async function createStudy(title: string, researcher: User): Promise<Study> {
  return db.study.create({
    data: {
      title: `${TEST_PREFIX} ${title}`,
      description: "DB-backed feedback/codebook persistence authorization test study",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
      sampleSize: 10,
      payment: "none",
      length: "10 minutes",
      status: "CLOSED",
      adminApproved: null,
      jatosStudyUUID: `${TEST_PREFIX}-${title}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
      researchers: {
        create: {
          userId: researcher.id,
          role: "PI",
        },
      },
      jatosStudyUploads: {
        create: {
          versionNumber: 1,
          jatosStudyId: Math.floor(200000 + Math.random() * 100000),
          jatosFileName: "study.jzip",
          buildHash: `${TEST_PREFIX}-${title}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          step1Completed: true,
          step2Completed: true,
          step3Completed: true,
          step4Completed: true,
        },
      },
    },
  })
}

async function addApprovedExtractionWithVariable(studyId: number) {
  const upload = await db.jatosStudyUpload.findFirstOrThrow({
    where: { studyId },
    orderBy: { createdAt: "desc" },
  })

  const pilotDatasetSnapshot = await db.pilotDatasetSnapshot.create({
    data: {
      jatosStudyUploadId: upload.id,
      pilotDatasetHash: `${TEST_PREFIX}-dataset-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
      pilotRunCount: 1,
      pilotRunIds: [101],
      markerTokens: ["pilot:marker"],
    },
  })

  const extraction = await db.extractionSnapshot.create({
    data: {
      jatosStudyUploadId: upload.id,
      pilotDatasetSnapshotId: pilotDatasetSnapshot.id,
      status: "APPROVED",
      approvedAt: new Date("2026-01-02T00:00:00.000Z"),
      extractorVersion: "test",
      variables: {
        create: {
          variableKey: "score-key",
          variableName: "score",
          dslKey: "score",
          type: "number",
          examples: [{ value: 5 }],
        },
      },
    },
  })

  await db.jatosStudyUpload.update({
    where: { id: upload.id },
    data: { approvedExtractionId: extraction.id },
  })

  return extraction
}

describe("feedback/codebook persistence authorization", () => {
  let researcher: User
  let otherResearcher: User
  let participant: User
  let study: Study

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.notifyAdminsOfPendingStudyReview.mockResolvedValue(undefined)

    researcher = await createUser("researcher", "RESEARCHER")
    otherResearcher = await createUser("other-researcher", "RESEARCHER")
    participant = await createUser("participant", "PARTICIPANT")
    study = await createStudy("study", researcher)
    await addApprovedExtractionWithVariable(study.id)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await db.study.deleteMany({
      where: { title: { startsWith: TEST_PREFIX } },
    })
    await db.user.deleteMany({
      where: { email: { startsWith: TEST_PREFIX } },
    })
  })

  it("allows only assigned researchers to create feedback templates", async () => {
    setSession(otherResearcher)

    await expect(
      saveFeedbackTemplateAction({
        studyId: study.id,
        content: "Unauthorized content",
      })
    ).resolves.toEqual({
      ok: false,
      userMessage: "You don't have access to save this template.",
    })
    await expect(
      db.feedbackTemplate.findUnique({ where: { studyId: study.id } })
    ).resolves.toBeNull()

    setSession(participant)
    await expect(
      saveFeedbackTemplateAction({
        studyId: study.id,
        content: "Participant content",
      })
    ).resolves.toEqual({
      ok: false,
      userMessage: "You don't have access to save this template.",
    })
    await expect(
      db.feedbackTemplate.findUnique({ where: { studyId: study.id } })
    ).resolves.toBeNull()

    setSession(researcher)
    const result = await saveFeedbackTemplateAction({
      studyId: study.id,
      content: "Authorized content",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected save to succeed")
    expect(result.template.content).toBe("Authorized content")
    await expect(
      db.feedbackTemplate.findUnique({ where: { studyId: study.id } })
    ).resolves.toMatchObject({ content: "Authorized content" })
  })

  it("allows only assigned researchers to persist codebook entries", async () => {
    const input = {
      studyId: study.id,
      variables: [
        {
          variableKey: "score-key",
          variableName: "score",
          dslKey: "score",
          description: "Participant score",
          personalData: false,
        },
      ],
      groups: [],
    }

    setSession(otherResearcher)
    await expect(updateVariableCodebookRsc(input)).rejects.toThrow(
      "You are not authorized to access this study."
    )
    await expect(db.codebook.findUnique({ where: { studyId: study.id } })).resolves.toBeNull()

    setSession(participant)
    await expect(updateVariableCodebookRsc(input)).rejects.toThrow(
      "You are not authorized to access this study."
    )
    await expect(db.codebook.findUnique({ where: { studyId: study.id } })).resolves.toBeNull()

    setSession(researcher)
    await expect(updateVariableCodebookRsc(input)).resolves.toEqual({
      success: true,
      feedbackPersonalDataConflict: false,
    })

    const codebook = await db.codebook.findUniqueOrThrow({
      where: { studyId: study.id },
      include: { entries: true },
    })
    expect(codebook.entries).toHaveLength(1)
    expect(codebook.entries[0]).toMatchObject({
      variableKey: "score-key",
      variableName: "score",
      dslKey: "score",
      description: "Participant score",
      personalData: false,
    })
  })
})
