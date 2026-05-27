import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import db, { type Study, type User } from "db"

const mocks = vi.hoisted(() => ({
  getBlitzContext: vi.fn(),
  getTokenForStudyService: vi.fn(),
  getResultsMetadata: vi.fn(),
  getResultsData: vi.fn(),
  parseJatosZip: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({
  getBlitzContext: mocks.getBlitzContext,
}))

vi.mock("@/src/lib/jatos/tokenBroker", () => ({
  getTokenForStudyService: mocks.getTokenForStudyService,
}))

vi.mock("@/src/lib/jatos/client/getResultsMetadata", () => ({
  getResultsMetadata: mocks.getResultsMetadata,
}))

vi.mock("@/src/lib/jatos/client/getResultsData", () => ({
  getResultsData: mocks.getResultsData,
}))

vi.mock("@/src/lib/jatos/parsers/parseJatosZip", () => ({
  parseJatosZip: mocks.parseJatosZip,
}))

import { fetchParticipantFeedbackAction } from "../actions/fetchParticipantFeedback"

const TEST_PREFIX = "participant-privacy-db-test"
const JATOS_STUDY_ID = 91001

function testEmail(name: string) {
  return `${TEST_PREFIX}-${name}@example.com`
}

function setParticipantSession(user: User) {
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

async function createStudy(researcher: User): Promise<Study> {
  return db.study.create({
    data: {
      title: `${TEST_PREFIX} study`,
      description: "DB-backed participant privacy regression test study",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
      sampleSize: 10,
      payment: "none",
      length: "10 minutes",
      status: "OPEN",
      adminApproved: true,
      jatosStudyUUID: `${TEST_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      researchers: {
        create: {
          userId: researcher.id,
          role: "PI",
        },
      },
      jatosStudyUploads: {
        create: {
          versionNumber: 1,
          jatosStudyId: JATOS_STUDY_ID,
          jatosFileName: "study.jzip",
          buildHash: `${TEST_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          step1Completed: true,
          step2Completed: true,
          step3Completed: true,
          step4Completed: true,
          step5Completed: true,
          step6Completed: true,
        },
      },
      FeedbackTemplate: {
        create: {
          content: "Thanks for completing the study.",
          requiredVariableNames: [],
        },
      },
    },
  })
}

function arrayBufferFromString(value: string): ArrayBuffer {
  const buffer = Buffer.from(value)
  const arrayBuffer = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(arrayBuffer).set(buffer)
  return arrayBuffer
}

describe("participant feedback privacy regression", () => {
  let researcher: User
  let participantA: User
  let participantB: User
  let study: Study

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})

    researcher = await createUser("researcher", "RESEARCHER")
    participantA = await createUser("participant-a", "PARTICIPANT")
    participantB = await createUser("participant-b", "PARTICIPANT")
    study = await createStudy(researcher)

    await db.participantStudy.createMany({
      data: [
        {
          userId: participantA.id,
          studyId: study.id,
          pseudonym: "participant-a-pseudonym",
          jatosRunUrl: "https://jatos.example/publix/participant-a-secret-run-url",
        },
        {
          userId: participantB.id,
          studyId: study.id,
          pseudonym: "participant-b-pseudonym",
          jatosRunUrl: "https://jatos.example/publix/participant-b-secret-run-url",
        },
      ],
    })

    mocks.getTokenForStudyService.mockResolvedValue("viewer-token-should-not-leak")
    mocks.getResultsMetadata.mockResolvedValue({
      data: [
        {
          studyId: JATOS_STUDY_ID,
          studyUuid: "study-uuid",
          studyTitle: "JATOS study",
          studyResults: [
            {
              id: 101,
              comment: "participant-a-pseudonym",
              endDate: 1767225600000,
              componentResults: [{ path: "/component-a", data: { size: 0 } }],
            },
            {
              id: 202,
              comment: "participant-b-pseudonym",
              endDate: 1767312000000,
              componentResults: [{ path: "/component-b", data: { size: 0 } }],
            },
          ],
        },
      ],
    })
    mocks.getResultsData.mockResolvedValue({
      success: true,
      data: arrayBufferFromString("zip"),
      contentType: "application/zip",
    })
    mocks.parseJatosZip.mockResolvedValue([])
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

  it("does not let one participant fetch another participant's feedback or leaked identifiers", async () => {
    setParticipantSession(participantA)

    const ownResult = await fetchParticipantFeedbackAction(
      study.id,
      "participant-a-pseudonym",
      JATOS_STUDY_ID
    )
    const ownPayload = JSON.stringify(ownResult)

    expect(ownResult).toMatchObject({
      kind: "done",
      loaded: {
        kind: "loaded",
        renderedMarkdown: expect.any(String),
      },
    })
    expect(ownPayload).not.toContain("participant-b-pseudonym")
    expect(ownPayload).not.toContain("participant-b-secret-run-url")
    expect(ownPayload).not.toContain("viewer-token-should-not-leak")

    vi.clearAllMocks()
    mocks.getTokenForStudyService.mockResolvedValue("viewer-token-should-not-leak")

    const crossParticipantResult = await fetchParticipantFeedbackAction(
      study.id,
      "participant-b-pseudonym",
      JATOS_STUDY_ID
    )
    const crossParticipantPayload = JSON.stringify(crossParticipantResult)

    expect(crossParticipantResult).toEqual({
      kind: "done",
      loaded: { kind: "failed", error: "Something went wrong. Please try again." },
    })
    expect(mocks.getTokenForStudyService).not.toHaveBeenCalled()
    expect(mocks.getResultsMetadata).not.toHaveBeenCalled()
    expect(crossParticipantPayload).not.toContain("participant-b-secret-run-url")
    expect(crossParticipantPayload).not.toContain("viewer-token-should-not-leak")
    expect(crossParticipantPayload).not.toContain("Pseudonym does not match authenticated user")
  })
})
