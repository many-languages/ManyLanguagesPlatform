import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import db, { type Study, type User } from "db"

const mocks = vi.hoisted(() => ({
  getBlitzContext: vi.fn(),
  createPersonalStudyCodeForResearcher: vi.fn(),
  getResultsMetadataForResearcher: vi.fn(),
  getStudyPropertiesForResearcher: vi.fn(),
  getAllPilotResultsForResearcher: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({
  getBlitzContext: mocks.getBlitzContext,
}))

vi.mock("@/src/lib/jatos/jatosAccessService", () => ({
  createPersonalStudyCodeForResearcher: mocks.createPersonalStudyCodeForResearcher,
  getResultsMetadataForResearcher: mocks.getResultsMetadataForResearcher,
  getStudyPropertiesForResearcher: mocks.getStudyPropertiesForResearcher,
  getAllPilotResultsForResearcher: mocks.getAllPilotResultsForResearcher,
}))

import { createResearcherPilotUrlAndSaveAction } from "../actions/createResearcherPilotUrl"
import { PILOT_LINK_LABEL_MAX_LENGTH } from "../domain/pilotLinkLabel"
import { getValidationDataRsc } from "./getValidationData"

const TEST_PREFIX = "pilot-link-label-db-test"
const JATOS_STUDY_ID = 4343
const JATOS_BATCH_ID = 8

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function createUser(name: string, role: User["role"]) {
  return db.user.create({
    data: { email: `${TEST_PREFIX}-${name}-${uniqueSuffix()}@example.com`, role },
  })
}

async function createStudy(researcher: User): Promise<Study> {
  return db.study.create({
    data: {
      title: `${TEST_PREFIX} study`,
      description: "DB-backed pilot link label test study",
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
          jatosWorkerType: "SINGLE",
          buildHash: "hash",
        },
      },
    },
  })
}

describe("pilot link labels", () => {
  let researcher: User
  let study: Study
  let studyResearcherId: number
  let jatosStudyUploadId: number
  let linkCounter: number

  const generate = (label?: string | null) =>
    createResearcherPilotUrlAndSaveAction({
      studyId: study.id,
      studyResearcherId,
      jatosStudyUploadId,
      jatosStudyId: JATOS_STUDY_ID,
      jatosBatchId: JATOS_BATCH_ID,
      label,
    })

  beforeEach(async () => {
    vi.clearAllMocks()
    linkCounter = 0
    researcher = await createUser("researcher", "RESEARCHER")
    study = await createStudy(researcher)
    const membership = await db.studyResearcher.findFirstOrThrow({
      where: { studyId: study.id, userId: researcher.id },
    })
    studyResearcherId = membership.id
    const upload = await db.jatosStudyUpload.findFirstOrThrow({ where: { studyId: study.id } })
    jatosStudyUploadId = upload.id

    mocks.getBlitzContext.mockResolvedValue({
      session: { userId: researcher.id, role: researcher.role, $authorize: vi.fn() },
    })
    mocks.createPersonalStudyCodeForResearcher.mockImplementation(
      async ({ onSave }: { onSave: (url: string) => Promise<void> }) => {
        const url = `https://jatos.example/publix/pilot-${++linkCounter}`
        await onSave(url)
        return url
      }
    )
    mocks.getResultsMetadataForResearcher.mockResolvedValue({ data: [] })
    mocks.getStudyPropertiesForResearcher.mockResolvedValue({})
    mocks.getAllPilotResultsForResearcher.mockResolvedValue([])
  })

  afterEach(async () => {
    await db.study.deleteMany({ where: { title: { startsWith: TEST_PREFIX } } })
    await db.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  })

  it("saves a trimmed label on the pilot link that carries the marker token", async () => {
    await generate("  fast responder  ")

    const link = await db.pilotLink.findFirstOrThrow({ where: { jatosStudyUploadId } })
    expect(link.label).toBe("fast responder")
    expect(mocks.createPersonalStudyCodeForResearcher).toHaveBeenCalledWith(
      expect.objectContaining({ comment: `pilot:${link.markerToken}` })
    )
  })

  it.each([undefined, null, "", "   "])("saves no label for %j", async (label) => {
    await generate(label)

    const link = await db.pilotLink.findFirstOrThrow({ where: { jatosStudyUploadId } })
    expect(link.label).toBeNull()
  })

  it("rejects too-long labels before creating a JATOS link", async () => {
    await expect(generate("a".repeat(PILOT_LINK_LABEL_MAX_LENGTH + 1))).rejects.toThrow(
      /at most 60 characters/
    )

    expect(mocks.createPersonalStudyCodeForResearcher).not.toHaveBeenCalled()
    expect(await db.pilotLink.count({ where: { jatosStudyUploadId } })).toBe(0)
  })

  it("exposes labels by marker token in the validation data, skipping unlabeled links", async () => {
    await generate("fast responder")
    await generate(null)
    await generate("careless responder")

    const labeled = await db.pilotLink.findMany({
      where: { jatosStudyUploadId, label: { not: null } },
    })
    const data = await getValidationDataRsc(study.id)

    expect(Object.keys(data.pilotLinkLabels ?? {})).toHaveLength(2)
    expect(data.pilotLinkLabels).toEqual(
      Object.fromEntries(labeled.map((link) => [link.markerToken, link.label]))
    )
    expect(Object.values(data.pilotLinkLabels ?? {}).sort()).toEqual([
      "careless responder",
      "fast responder",
    ])
  })
})
