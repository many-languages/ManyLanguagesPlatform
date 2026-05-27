import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthorizationError } from "blitz"
import db, { type User, type Study } from "db"
import {
  assertParticipantCanAccessStudy,
  assertResearcherCanAccessStudy,
} from "@/src/lib/jatos/jatosAccess/core"

const mocks = vi.hoisted(() => ({
  getBlitzContext: vi.fn(),
  sendNotification: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({
  getBlitzContext: mocks.getBlitzContext,
}))

vi.mock("@/src/features/notifications", () => ({
  sendNotification: mocks.sendNotification,
}))

import { approveStudy } from "./adminStudyWrites"

const TEST_PREFIX = "authorization-db-test"

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

async function createStudy(title: string, researcher?: User): Promise<Study> {
  return db.study.create({
    data: {
      title: `${TEST_PREFIX} ${title}`,
      description: "DB-backed authorization test study",
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
      ...(researcher
        ? {
            researchers: {
              create: {
                userId: researcher.id,
                role: "PI",
              },
            },
          }
        : {}),
    },
  })
}

describe("DB-backed authorization boundaries", () => {
  let researcherA: User
  let researcherB: User
  let participantA: User
  let participantB: User
  let admin: User
  let studyA: Study
  let studyB: Study

  beforeEach(async () => {
    vi.clearAllMocks()
    mocks.sendNotification.mockResolvedValue(undefined)

    researcherA = await createUser("researcher-a", "RESEARCHER")
    researcherB = await createUser("researcher-b", "RESEARCHER")
    participantA = await createUser("participant-a", "PARTICIPANT")
    participantB = await createUser("participant-b", "PARTICIPANT")
    admin = await createUser("admin", "ADMIN")

    studyA = await createStudy("study-a", researcherA)
    studyB = await createStudy("study-b", researcherB)

    await db.participantStudy.createMany({
      data: [
        {
          userId: participantA.id,
          studyId: studyA.id,
          pseudonym: "participant-a-pseudonym",
          jatosRunUrl: "https://jatos.example/publix/participant-a-secret",
        },
        {
          userId: participantB.id,
          studyId: studyA.id,
          pseudonym: "participant-b-pseudonym",
          jatosRunUrl: "https://jatos.example/publix/participant-b-secret",
        },
      ],
    })
  })

  afterEach(async () => {
    await db.study.deleteMany({
      where: { title: { startsWith: TEST_PREFIX } },
    })
    await db.user.deleteMany({
      where: { email: { startsWith: TEST_PREFIX } },
    })
  })

  it("allows only researchers assigned through the real StudyResearcher relation", async () => {
    await expect(
      assertResearcherCanAccessStudy({ studyId: studyA.id, userId: researcherA.id })
    ).resolves.toBeUndefined()

    await expect(
      assertResearcherCanAccessStudy({ studyId: studyA.id, userId: researcherB.id })
    ).rejects.toThrow("You are not authorized to access this study.")
  })

  it("allows only the authenticated participant's own real ParticipantStudy row", async () => {
    const participantARow = await db.participantStudy.findUniqueOrThrow({
      where: { userId_studyId: { userId: participantA.id, studyId: studyA.id } },
    })
    const participantBRow = await db.participantStudy.findUniqueOrThrow({
      where: { userId_studyId: { userId: participantB.id, studyId: studyA.id } },
    })

    await expect(
      assertParticipantCanAccessStudy({
        studyId: studyA.id,
        userId: participantA.id,
        participantStudyId: participantARow.id,
        pseudonym: participantARow.pseudonym,
      })
    ).resolves.toBeUndefined()

    await expect(
      assertParticipantCanAccessStudy({
        studyId: studyA.id,
        userId: participantA.id,
        participantStudyId: participantBRow.id,
        pseudonym: participantBRow.pseudonym,
      })
    ).rejects.toThrow("Participant record does not match authenticated study membership")

    await expect(
      assertParticipantCanAccessStudy({
        studyId: studyB.id,
        userId: participantA.id,
        pseudonym: participantARow.pseudonym,
      })
    ).rejects.toThrow("Participant not found for this study")
  })

  it("rejects non-admin admin writes before changing study state", async () => {
    setSession(researcherA)

    await expect(approveStudy([studyA.id])).rejects.toThrow(AuthorizationError)

    const unchangedStudy = await db.study.findUniqueOrThrow({ where: { id: studyA.id } })
    expect(unchangedStudy.adminApproved).toBeNull()
    expect(unchangedStudy.adminReviewedById).toBeNull()
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  it("allows staff admins to perform representative admin-only writes", async () => {
    setSession(admin)

    await expect(approveStudy([studyA.id])).resolves.toEqual({ updated: 1 })

    const approvedStudy = await db.study.findUniqueOrThrow({ where: { id: studyA.id } })
    expect(approvedStudy.adminApproved).toBe(true)
    expect(approvedStudy.adminReviewedById).toBe(admin.id)
    expect(mocks.sendNotification).toHaveBeenCalledTimes(1)
  })
})
