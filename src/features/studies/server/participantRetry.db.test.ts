import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import db, { type JatosWorkerType, type Study, type User, type UserRole } from "db"

const mocks = vi.hoisted(() => ({
  getBlitzContext: vi.fn(),
  getResultsMetadataForResearcher: vi.fn(),
  getStartedRunCodesForResearcher: vi.fn(),
  createPersonalStudyCodeForResearcher: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({
  getBlitzContext: mocks.getBlitzContext,
}))

vi.mock("@/src/lib/jatos/jatosAccessService", () => ({
  getResultsMetadataForResearcher: mocks.getResultsMetadataForResearcher,
  getStartedRunCodesForResearcher: mocks.getStartedRunCodesForResearcher,
  createPersonalStudyCodeForResearcher: mocks.createPersonalStudyCodeForResearcher,
}))

import { ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE } from "../domain/studyEditability"
import { allowParticipantRetry } from "./participantRetryWrites"

const TEST_PREFIX = "participant-retry-db-test"
const JATOS_STUDY_ID = 4242
const JATOS_BATCH_ID = 7
const runUrl = (code: string) => `https://jatos.example/publix/${code}`

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function setSession(user: User) {
  mocks.getBlitzContext.mockResolvedValue({
    session: { userId: user.id, role: user.roles[0], $authorize: vi.fn() },
  })
}

async function createUser(name: string, role: UserRole) {
  return db.user.create({
    data: { email: `${TEST_PREFIX}-${name}-${uniqueSuffix()}@example.com`, roles: [role] },
  })
}

async function createStudy(
  researcher: User,
  workerType: JatosWorkerType = "SINGLE"
): Promise<Study> {
  return db.study.create({
    data: {
      title: `${TEST_PREFIX} study`,
      description: "DB-backed participant retry test study",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
      sampleSize: 10,
      payment: "none",
      length: "10 minutes",
      status: "OPEN",
      jatosStudyUUID: `${TEST_PREFIX}-${uniqueSuffix()}`,
      researchers: { create: { userId: researcher.id, role: "PI" } },
      jatosStudyUploads: {
        create: {
          versionNumber: 1,
          jatosStudyId: JATOS_STUDY_ID,
          jatosFileName: "study.jzip",
          jatosBatchId: JATOS_BATCH_ID,
          jatosWorkerType: workerType,
          buildHash: "hash",
        },
      },
    },
  })
}

async function addParticipant(study: Study, name: string) {
  const user = await createUser(name, "PARTICIPANT")
  return db.participantStudy.create({
    data: {
      userId: user.id,
      studyId: study.id,
      pseudonym: `${TEST_PREFIX}-pseudonym-${name}`,
      jatosRunUrl: runUrl(`old-${name}`),
    },
  })
}

/** Mocked JATOS state: which codes were started, and which results exist per pseudonym. */
function mockJatos(opts: {
  startedNames: string[]
  results?: { id: number; name: string; studyState: string }[]
}) {
  mocks.getStartedRunCodesForResearcher.mockResolvedValue(
    new Set(opts.startedNames.map((name) => `old-${name}`))
  )
  mocks.getResultsMetadataForResearcher.mockResolvedValue({
    data: [
      {
        studyId: JATOS_STUDY_ID,
        studyResults: (opts.results ?? []).map((r) => ({
          id: r.id,
          comment: `${TEST_PREFIX}-pseudonym-${r.name}`,
          studyState: r.studyState,
        })),
      },
    ],
  })
}

describe("allowParticipantRetry", () => {
  let researcher: User
  let outsider: User
  let study: Study
  let newLinkCounter: number

  beforeEach(async () => {
    vi.clearAllMocks()
    newLinkCounter = 0
    researcher = await createUser("researcher", "RESEARCHER")
    outsider = await createUser("outsider", "RESEARCHER")
    study = await createStudy(researcher)
    setSession(researcher)

    mocks.createPersonalStudyCodeForResearcher.mockImplementation(
      async ({ onSave }: { onSave: (url: string) => Promise<void> }) => {
        const url = runUrl(`new-${++newLinkCounter}`)
        await onSave(url)
        return url
      }
    )
  })

  afterEach(async () => {
    await db.study.deleteMany({ where: { title: { startsWith: TEST_PREFIX } } })
    await db.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  })

  it("replaces the run link of a started, unfinished participant and keeps the pseudonym", async () => {
    const participant = await addParticipant(study, "a")
    mockJatos({ startedNames: ["a"], results: [{ id: 1, name: "a", studyState: "FAIL" }] })

    await expect(allowParticipantRetry({ participantIds: [participant.id] })).resolves.toEqual({
      granted: 1,
    })

    const after = await db.participantStudy.findUniqueOrThrow({ where: { id: participant.id } })
    expect(after.jatosRunUrl).toBe(runUrl("new-1"))
    expect(after.pseudonym).toBe(participant.pseudonym)
    expect(mocks.createPersonalStudyCodeForResearcher).toHaveBeenCalledWith(
      expect.objectContaining({
        studyId: study.id,
        userId: researcher.id,
        jatosStudyId: JATOS_STUDY_ID,
        jatosBatchId: JATOS_BATCH_ID,
        type: "ps",
        comment: participant.pseudonym,
      })
    )
  })

  it("rejects researchers who are not assigned to the study", async () => {
    const participant = await addParticipant(study, "a")
    mockJatos({ startedNames: ["a"] })
    setSession(outsider)

    await expect(allowParticipantRetry({ participantIds: [participant.id] })).rejects.toThrow(
      "You are not authorized to access this study."
    )

    expect(mocks.createPersonalStudyCodeForResearcher).not.toHaveBeenCalled()
    const after = await db.participantStudy.findUniqueOrThrow({ where: { id: participant.id } })
    expect(after.jatosRunUrl).toBe(runUrl("old-a"))
  })

  it("rejects archived studies", async () => {
    const participant = await addParticipant(study, "a")
    mockJatos({ startedNames: ["a"] })
    await db.study.update({ where: { id: study.id }, data: { archived: true } })

    await expect(allowParticipantRetry({ participantIds: [participant.id] })).rejects.toThrow(
      ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE
    )

    expect(mocks.createPersonalStudyCodeForResearcher).not.toHaveBeenCalled()
    const after = await db.participantStudy.findUniqueOrThrow({ where: { id: participant.id } })
    expect(after.jatosRunUrl).toBe(runUrl("old-a"))
  })

  it("rejects multiple-run studies", async () => {
    const multiStudy = await createStudy(researcher, "MULTIPLE")
    const participant = await addParticipant(multiStudy, "a")
    mockJatos({ startedNames: ["a"] })

    await expect(allowParticipantRetry({ participantIds: [participant.id] })).rejects.toThrow(
      /cannot be given a retry/
    )
    expect(mocks.createPersonalStudyCodeForResearcher).not.toHaveBeenCalled()
  })

  it("rejects participants who never started", async () => {
    const participant = await addParticipant(study, "a")
    mockJatos({ startedNames: [] })

    await expect(allowParticipantRetry({ participantIds: [participant.id] })).rejects.toThrow(
      /cannot be given a retry/
    )
    expect(mocks.createPersonalStudyCodeForResearcher).not.toHaveBeenCalled()
  })

  it("creates no links at all when one selected participant already finished", async () => {
    const failed = await addParticipant(study, "failed")
    const finished = await addParticipant(study, "finished")
    mockJatos({
      startedNames: ["failed", "finished"],
      results: [
        { id: 1, name: "failed", studyState: "FAIL" },
        { id: 2, name: "finished", studyState: "FINISHED" },
      ],
    })

    await expect(
      allowParticipantRetry({ participantIds: [failed.id, finished.id] })
    ).rejects.toThrow(/cannot be given a retry/)

    expect(mocks.createPersonalStudyCodeForResearcher).not.toHaveBeenCalled()
    const after = await db.participantStudy.findUniqueOrThrow({ where: { id: failed.id } })
    expect(after.jatosRunUrl).toBe(runUrl("old-failed"))
  })

  it("keeps links already created and reports progress when JATOS fails midway", async () => {
    const first = await addParticipant(study, "first")
    const second = await addParticipant(study, "second")
    mockJatos({ startedNames: ["first", "second"] })

    mocks.createPersonalStudyCodeForResearcher
      .mockImplementationOnce(async ({ onSave }: { onSave: (url: string) => Promise<void> }) => {
        await onSave(runUrl("new-first"))
        return runUrl("new-first")
      })
      .mockRejectedValueOnce(new Error("JATOS unavailable"))

    await expect(allowParticipantRetry({ participantIds: [first.id, second.id] })).rejects.toThrow(
      /Retry granted to 1 of 2 participants/
    )

    const rows = await db.participantStudy.findMany({
      where: { id: { in: [first.id, second.id] } },
    })
    const urls = new Map(rows.map((row) => [row.id, row.jatosRunUrl]))
    expect(urls.get(first.id)).toBe(runUrl("new-first"))
    expect(urls.get(second.id)).toBe(runUrl("old-second"))
  })
})
