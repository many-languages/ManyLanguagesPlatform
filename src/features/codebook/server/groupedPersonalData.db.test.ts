import { readFileSync } from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import db, { type Study, type User } from "db"

const mocks = vi.hoisted(() => ({
  getBlitzContext: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({
  getBlitzContext: mocks.getBlitzContext,
}))

import { updateVariableCodebookRsc } from "@/src/features/codebook/server/updateVariableCodebook"
import { fetchCodebookMergedVariablesForStudy } from "@/src/features/codebook/server/getCodebookData"
import { getPersonalDataViolationsForPersistedTemplate } from "@/src/features/feedback/server/feedbackTemplatePersonalDataViolations"

const TEST_PREFIX = "grouped-personal-data-db-test"

const VARIABLES = [
  { variableKey: "rt-key", variableName: "rt", dslKey: "task.rt" },
  { variableKey: "acc-key", variableName: "accuracy", dslKey: "task.accuracy" },
  { variableKey: "age-key", variableName: "age", dslKey: "age" },
]

const TEMPLATE = {
  content: "Your reaction time was {{var:task.rt}} and accuracy {{var:task.accuracy}}.",
  requiredVariableNames: ["task.rt", "task.accuracy"],
}

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function codebookInput(
  studyId: number,
  personal: Record<string, boolean>,
  groups: { groupKey: string; description: string | null }[]
) {
  return {
    studyId,
    variables: VARIABLES.map((v) => ({
      ...v,
      description: `${v.variableName} description`,
      personalData: personal[v.dslKey] ?? false,
    })),
    groups,
  }
}

async function createStudyWithExtraction(researcher: User): Promise<Study> {
  const study = await db.study.create({
    data: {
      title: `${TEST_PREFIX} study`,
      description: "DB-backed grouped personal data test study",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
      sampleSize: 10,
      payment: "none",
      length: "10 minutes",
      status: "CLOSED",
      adminApproved: null,
      jatosStudyUUID: `${TEST_PREFIX}-${uniqueSuffix()}`,
      researchers: { create: { userId: researcher.id, role: "PI" } },
      jatosStudyUploads: {
        create: {
          versionNumber: 1,
          jatosStudyId: Math.floor(200000 + Math.random() * 100000),
          jatosFileName: "study.jzip",
          buildHash: `${TEST_PREFIX}-${uniqueSuffix()}`,
          step1Completed: true,
          step2Completed: true,
          step3Completed: true,
          step4Completed: true,
        },
      },
    },
  })

  const upload = await db.jatosStudyUpload.findFirstOrThrow({ where: { studyId: study.id } })
  const snapshot = await db.pilotDatasetSnapshot.create({
    data: {
      jatosStudyUploadId: upload.id,
      pilotDatasetHash: `${TEST_PREFIX}-dataset-${uniqueSuffix()}`,
      pilotRunCount: 1,
      pilotRunIds: [101],
      markerTokens: ["pilot:marker"],
    },
  })
  const extraction = await db.extractionSnapshot.create({
    data: {
      jatosStudyUploadId: upload.id,
      pilotDatasetSnapshotId: snapshot.id,
      status: "APPROVED",
      approvedAt: new Date("2026-01-02T00:00:00.000Z"),
      extractorVersion: "test",
      variables: {
        create: VARIABLES.map((v, position) => ({
          ...v,
          type: "number",
          examples: [{ value: 1 }],
          position,
        })),
      },
    },
  })
  await db.jatosStudyUpload.update({
    where: { id: upload.id },
    data: { approvedExtractionId: extraction.id },
  })

  return study
}

describe("personal data flags on grouped variables", () => {
  let researcher: User
  let study: Study

  const violations = () =>
    getPersonalDataViolationsForPersistedTemplate(study.id, TEMPLATE).then((v) => v.sort())

  const personalByDslKey = async () => {
    const { variables } = await fetchCodebookMergedVariablesForStudy(study.id)
    return Object.fromEntries(variables.map((v) => [v.dslKey, v.personalData]))
  }

  beforeEach(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    researcher = await db.user.create({
      data: { email: `${TEST_PREFIX}-${uniqueSuffix()}@example.com`, roles: ["RESEARCHER"] },
    })
    mocks.getBlitzContext.mockResolvedValue({
      session: { userId: researcher.id, role: researcher.roles[0], $authorize: vi.fn() },
    })
    study = await createStudyWithExtraction(researcher)
    await db.feedbackTemplate.create({ data: { studyId: study.id, ...TEMPLATE } })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await db.study.deleteMany({ where: { title: { startsWith: TEST_PREFIX } } })
    await db.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  })

  const group = [{ groupKey: "task", description: "Task metrics" }]

  it("flags a template that uses grouped variables once they are personal", async () => {
    const result = await updateVariableCodebookRsc(
      codebookInput(study.id, { "task.rt": true, "task.accuracy": true }, group)
    )

    expect(result.feedbackPersonalDataConflict).toBe(true)
    await expect(violations()).resolves.toEqual(["task.accuracy", "task.rt"])
  })

  it("only reports the variables that are actually flagged (mixed group)", async () => {
    const result = await updateVariableCodebookRsc(
      codebookInput(study.id, { "task.rt": true }, group)
    )

    expect(result.feedbackPersonalDataConflict).toBe(true)
    await expect(violations()).resolves.toEqual(["task.rt"])
    await expect(personalByDslKey()).resolves.toEqual({
      "task.rt": true,
      "task.accuracy": false,
      age: false,
    })
  })

  it("clears the conflict when the flags are removed from the grouped variables", async () => {
    await updateVariableCodebookRsc(
      codebookInput(study.id, { "task.rt": true, "task.accuracy": true }, group)
    )
    const result = await updateVariableCodebookRsc(codebookInput(study.id, {}, group))

    expect(result.feedbackPersonalDataConflict).toBe(false)
    await expect(violations()).resolves.toEqual([])
  })

  it("keeps variable flags when the group is removed", async () => {
    await updateVariableCodebookRsc(
      codebookInput(study.id, { "task.rt": true, "task.accuracy": true }, group)
    )
    await updateVariableCodebookRsc(
      codebookInput(study.id, { "task.rt": true, "task.accuracy": true }, [])
    )

    await expect(personalByDslKey()).resolves.toEqual({
      "task.rt": true,
      "task.accuracy": true,
      age: false,
    })
    await expect(violations()).resolves.toEqual(["task.accuracy", "task.rt"])
  })

  it("ignores a legacy group-level flag that was never copied to the variables", async () => {
    await updateVariableCodebookRsc(codebookInput(study.id, {}, group))
    await db.codebookGroup.updateMany({
      where: { codebook: { studyId: study.id } },
      data: { personalData: true },
    })

    await expect(violations()).resolves.toEqual([])
  })

  it("backfill migration copies a legacy group flag onto the covered variables only", async () => {
    await updateVariableCodebookRsc(codebookInput(study.id, {}, group))
    await db.codebookGroup.updateMany({
      where: { codebook: { studyId: study.id } },
      data: { personalData: true },
    })

    const sql = readFileSync(
      path.join(
        process.cwd(),
        "db/migrations/20260618120000_backfill_group_personal_data_to_variables/migration.sql"
      ),
      "utf8"
    )
    await db.$executeRawUnsafe(sql)

    await expect(personalByDslKey()).resolves.toEqual({
      "task.rt": true,
      "task.accuracy": true,
      age: false,
    })
    await expect(violations()).resolves.toEqual(["task.accuracy", "task.rt"])
  })
})
