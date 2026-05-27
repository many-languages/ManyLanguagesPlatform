import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthorizationError } from "blitz"
import db, { type Study, type User } from "db"

const mocks = vi.hoisted(() => ({
  getBlitzContext: vi.fn(),
  sendNotification: vi.fn(),
  getTokenForStudyService: vi.fn(),
  getResultsMetadata: vi.fn(),
  deleteStudyAsAdmin: vi.fn(),
  deletePlatformStudyFromJatos: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({
  getBlitzContext: mocks.getBlitzContext,
}))

vi.mock("@/src/features/notifications", () => ({
  sendNotification: mocks.sendNotification,
}))

vi.mock("@/src/lib/jatos/tokenBroker", () => ({
  getTokenForStudyService: mocks.getTokenForStudyService,
}))

vi.mock("@/src/lib/jatos/client/getResultsMetadata", () => ({
  getResultsMetadata: mocks.getResultsMetadata,
}))

vi.mock("@/src/lib/jatos/admin/deleteStudyWorkflow", () => ({
  deleteStudyAsAdmin: mocks.deleteStudyAsAdmin,
  deletePlatformStudyFromJatos: mocks.deletePlatformStudyFromJatos,
}))

import {
  approveStudy,
  deleteStudy,
  disableDataCollection,
  enableDataCollection,
  rejectStudy,
} from "./adminStudyWrites"
import { archiveStudy, unarchiveStudy } from "./studyLifecycleWrites"

const TEST_PREFIX = "admin-lifecycle-db-test"

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

async function createStudy(
  title: string,
  researcher: User,
  options: {
    adminApproved?: boolean | null
    status?: "OPEN" | "CLOSED"
    archived?: boolean
    completeSetup?: boolean
    jatosStudyId?: number
  } = {}
): Promise<Study> {
  const jatosStudyId = options.jatosStudyId ?? Math.floor(100000 + Math.random() * 100000)

  return db.study.create({
    data: {
      title: `${TEST_PREFIX} ${title}`,
      description: "DB-backed admin lifecycle mutation test study",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
      sampleSize: 10,
      payment: "none",
      length: "10 minutes",
      status: options.status ?? "CLOSED",
      adminApproved: options.adminApproved ?? null,
      archived: options.archived ?? false,
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
          jatosStudyId,
          jatosFileName: "study.jzip",
          buildHash: `${TEST_PREFIX}-${title}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          step1Completed: options.completeSetup ?? true,
          step2Completed: options.completeSetup ?? true,
          step3Completed: options.completeSetup ?? true,
          step4Completed: options.completeSetup ?? true,
          step5Completed: options.completeSetup ?? true,
          step6Completed: options.completeSetup ?? true,
        },
      },
      FeedbackTemplate: {
        create: {
          content: "Thanks.",
          requiredVariableNames: [],
        },
      },
    },
  })
}

function mockNoParticipantResponses() {
  mocks.getTokenForStudyService.mockResolvedValue("study-service-token")
  mocks.getResultsMetadata.mockResolvedValue({
    data: [
      {
        studyId: 1,
        studyUuid: "uuid",
        studyTitle: "Study",
        studyResults: [],
      },
    ],
  })
}

function mockParticipantResponses() {
  mocks.getTokenForStudyService.mockResolvedValue("study-service-token")
  mocks.getResultsMetadata.mockResolvedValue({
    data: [
      {
        studyId: 1,
        studyUuid: "uuid",
        studyTitle: "Study",
        studyResults: [
          {
            id: 1,
            comment: "participant-response",
            studyState: "FINISHED",
            endDate: 1767225600000,
            componentResults: [],
          },
        ],
      },
    ],
  })
}

describe("admin lifecycle mutation boundaries", () => {
  let researcher: User
  let otherResearcher: User
  let admin: User
  let superadmin: User

  beforeEach(async () => {
    vi.clearAllMocks()
    mocks.sendNotification.mockResolvedValue(undefined)
    mocks.deleteStudyAsAdmin.mockResolvedValue(undefined)
    mocks.deletePlatformStudyFromJatos.mockResolvedValue(undefined)
    mockNoParticipantResponses()

    researcher = await createUser("researcher", "RESEARCHER")
    otherResearcher = await createUser("other-researcher", "RESEARCHER")
    admin = await createUser("admin", "ADMIN")
    superadmin = await createUser("superadmin", "SUPERADMIN")
  })

  afterEach(async () => {
    await db.study.deleteMany({
      where: { title: { startsWith: TEST_PREFIX } },
    })
    await db.adminAuditEvent.deleteMany({
      where: {
        actorUserId: {
          in: [researcher?.id, otherResearcher?.id, admin?.id, superadmin?.id].filter(
            (id): id is number => typeof id === "number"
          ),
        },
      },
    })
    await db.user.deleteMany({
      where: { email: { startsWith: TEST_PREFIX } },
    })
  })

  it("requires staff admin for review and data-collection mutations", async () => {
    const study = await createStudy("staff-only", researcher, {
      adminApproved: null,
      status: "CLOSED",
      completeSetup: true,
    })
    setSession(researcher)

    await expect(approveStudy([study.id])).rejects.toThrow(AuthorizationError)
    await expect(rejectStudy([study.id])).rejects.toThrow(AuthorizationError)
    await expect(enableDataCollection([study.id])).rejects.toThrow(AuthorizationError)
    await expect(disableDataCollection([study.id])).rejects.toThrow(AuthorizationError)

    const unchanged = await db.study.findUniqueOrThrow({ where: { id: study.id } })
    expect(unchanged.adminApproved).toBeNull()
    expect(unchanged.status).toBe("CLOSED")
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  it("lets staff admins approve, reject, enable, and disable eligible studies", async () => {
    const study = await createStudy("admin-review", researcher, {
      adminApproved: null,
      status: "CLOSED",
      completeSetup: true,
    })
    setSession(admin)

    await expect(approveStudy([study.id])).resolves.toEqual({ updated: 1 })
    let current = await db.study.findUniqueOrThrow({ where: { id: study.id } })
    expect(current.adminApproved).toBe(true)
    expect(current.adminReviewedById).toBe(admin.id)

    await expect(enableDataCollection([study.id])).resolves.toEqual({ updated: 1 })
    current = await db.study.findUniqueOrThrow({ where: { id: study.id } })
    expect(current.status).toBe("OPEN")

    await expect(disableDataCollection([study.id])).resolves.toEqual({ updated: 1 })
    current = await db.study.findUniqueOrThrow({ where: { id: study.id } })
    expect(current.status).toBe("CLOSED")

    await expect(rejectStudy([study.id])).resolves.toEqual({ updated: 1 })
    current = await db.study.findUniqueOrThrow({ where: { id: study.id } })
    expect(current.adminApproved).toBe(false)
    expect(current.adminReviewedById).toBe(admin.id)
    expect(mocks.sendNotification).toHaveBeenCalled()

    const auditEvents = await db.adminAuditEvent.findMany({
      where: { entityType: "Study", entityId: study.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    expect(auditEvents.map((event) => event.event)).toEqual([
      "admin_study_approved",
      "data_collection_enabled",
      "data_collection_disabled",
      "admin_study_rejected",
    ])
    expect(auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorUserId: admin.id,
          actorRole: "ADMIN",
          entityType: "Study",
          entityId: study.id,
        }),
      ])
    )
    expect(
      auditEvents.find((event) => event.event === "data_collection_enabled")?.metadata
    ).toMatchObject({
      studyTitle: study.title,
      previousStatus: "CLOSED",
      newStatus: "OPEN",
    })
    expect(
      auditEvents.find((event) => event.event === "data_collection_disabled")?.metadata
    ).toMatchObject({
      studyTitle: study.title,
      previousStatus: "OPEN",
      newStatus: "CLOSED",
    })
  })

  it("blocks enabling data collection when setup or approval is incomplete", async () => {
    const incomplete = await createStudy("incomplete", researcher, {
      adminApproved: true,
      status: "CLOSED",
      completeSetup: false,
    })
    const unapproved = await createStudy("unapproved", researcher, {
      adminApproved: null,
      status: "CLOSED",
      completeSetup: true,
    })
    setSession(admin)

    await expect(enableDataCollection([incomplete.id])).rejects.toThrow(
      "Cannot enable data collection"
    )
    await expect(enableDataCollection([unapproved.id])).rejects.toThrow(
      "Cannot enable data collection"
    )

    await expect(
      db.study.findUniqueOrThrow({ where: { id: incomplete.id } })
    ).resolves.toMatchObject({ status: "CLOSED" })
    await expect(
      db.study.findUniqueOrThrow({ where: { id: unapproved.id } })
    ).resolves.toMatchObject({ status: "CLOSED" })
  })

  it("allows only staff admins or the study PI to archive and unarchive", async () => {
    const study = await createStudy("archive", researcher, {
      adminApproved: true,
      status: "OPEN",
      completeSetup: true,
    })
    mockParticipantResponses()

    setSession(otherResearcher)
    await expect(archiveStudy(study.id)).rejects.toThrow(
      "You are not authorized to archive this study"
    )

    setSession(researcher)
    await expect(archiveStudy(study.id)).resolves.toMatchObject({
      id: study.id,
      archived: true,
      status: "CLOSED",
    })
    let current = await db.study.findUniqueOrThrow({ where: { id: study.id } })
    expect(current.archived).toBe(true)
    expect(current.archivedById).toBe(researcher.id)

    setSession(otherResearcher)
    await expect(unarchiveStudy(study.id)).rejects.toThrow(
      "You are not authorized to unarchive this study"
    )

    setSession(admin)
    await expect(unarchiveStudy(study.id)).resolves.toMatchObject({
      id: study.id,
      archived: false,
    })
    current = await db.study.findUniqueOrThrow({ where: { id: study.id } })
    expect(current.archived).toBe(false)
    expect(current.archivedById).toBeNull()
  })

  it("blocks staff-admin deletion of archived studies with participant responses", async () => {
    const study = await createStudy("delete-blocked", researcher, {
      adminApproved: true,
      archived: true,
      status: "CLOSED",
      completeSetup: true,
    })
    mockParticipantResponses()
    setSession(admin)

    await expect(deleteStudy({ studyIds: [study.id], reason: "cleanup" })).rejects.toThrow(
      "archived studies with participant responses may only be removed by a superadmin"
    )

    await expect(db.study.findUnique({ where: { id: study.id } })).resolves.not.toBeNull()
    expect(mocks.deleteStudyAsAdmin).not.toHaveBeenCalled()
  })

  it("lets superadmins delete archived studies with participant responses after JATOS deletion", async () => {
    const study = await createStudy("delete-superadmin", researcher, {
      adminApproved: true,
      archived: true,
      status: "CLOSED",
      completeSetup: true,
    })
    mockParticipantResponses()
    setSession(superadmin)

    await expect(deleteStudy({ studyIds: [study.id], reason: "cleanup" })).resolves.toEqual({
      updated: 1,
    })

    await expect(db.study.findUnique({ where: { id: study.id } })).resolves.toBeNull()
    expect(mocks.deleteStudyAsAdmin).toHaveBeenCalledWith({
      studyId: study.id,
      adminUserId: superadmin.id,
      reason: "cleanup",
    })

    const auditEvents = await db.adminAuditEvent.findMany({
      where: { entityType: "Study", entityId: study.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    expect(auditEvents).toHaveLength(2)
    expect(auditEvents.map((event) => event.event)).toEqual([
      "study_deletion_requested",
      "study_deleted",
    ])
    expect(auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorUserId: superadmin.id,
          actorRole: "SUPERADMIN",
          entityType: "Study",
          entityId: study.id,
        }),
      ])
    )
    expect(auditEvents[0]?.metadata).toMatchObject({
      reason: "cleanup",
      studyTitle: study.title,
      hasParticipantResponses: true,
    })
  })

  it("records an audit event when JATOS deletion fails and keeps the study", async () => {
    const study = await createStudy("delete-jatos-failure", researcher, {
      adminApproved: true,
      archived: false,
      status: "CLOSED",
      completeSetup: true,
    })
    mocks.deleteStudyAsAdmin.mockRejectedValueOnce(new Error("JATOS unavailable"))
    setSession(admin)

    await expect(deleteStudy({ studyIds: [study.id], reason: "failed cleanup" })).rejects.toThrow(
      "JATOS unavailable"
    )

    await expect(db.study.findUnique({ where: { id: study.id } })).resolves.not.toBeNull()

    const auditEvents = await db.adminAuditEvent.findMany({
      where: { entityType: "Study", entityId: study.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    expect(auditEvents.map((event) => event.event)).toEqual([
      "study_deletion_requested",
      "jatos_deletion_failed",
    ])
    expect(auditEvents[1]?.metadata).toMatchObject({
      reason: "failed cleanup",
      errorName: "Error",
    })
  })
})
