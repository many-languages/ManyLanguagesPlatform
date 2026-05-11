import db from "db"
import type { UserRole } from "@/db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { sendNotification } from "@/src/features/notifications"
import { deletePlatformStudyFromJatos } from "@/src/lib/jatos/admin/deleteStudyWorkflow"
import {
  assertStudyArchiveAllowed,
  assertStudyDeleteAllowedByResponses,
  assertStudyNotArchived,
} from "./studyLifecycle"

async function performArchiveStudy(studyId: number, userId: number, role: UserRole) {
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    const researcher = await db.studyResearcher.findFirst({
      where: { studyId, userId, role: "PI" },
    })

    if (!researcher) {
      throw new Error("You are not authorized to archive this study")
    }
  }

  await assertStudyArchiveAllowed(studyId)

  return db.study.update({
    where: { id: studyId },
    data: {
      archived: true,
      archivedAt: new Date(),
      archivedById: userId,
      status: "CLOSED",
    },
    select: { id: true, archived: true, archivedAt: true, status: true },
  })
}

export async function archiveStudy(studyId: number) {
  const session = await getAuthorizedSession()

  if (!session.userId) {
    throw new Error("You must be logged in to archive this study")
  }

  const role = session.role as UserRole
  if (role !== "ADMIN" && role !== "SUPERADMIN" && role !== "RESEARCHER") {
    throw new Error("You are not authorized to archive this study")
  }

  return performArchiveStudy(studyId, session.userId, role)
}

export async function unarchiveStudy(studyId: number) {
  const session = await getAuthorizedSession()
  const userId = session.userId
  const role = session.role as UserRole

  if (!userId) {
    throw new Error("Not authenticated")
  }

  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    const can = await db.studyResearcher.findFirst({
      where: { studyId, userId, role: "PI" },
    })

    if (!can) {
      throw new Error("You are not authorized to unarchive this study")
    }
  }

  return db.study.update({
    where: { id: studyId },
    data: { archived: false, archivedAt: null, archivedById: null },
    select: { id: true, archived: true },
  })
}

export async function deleteResearcherStudy(studyId: number) {
  const session = await getAuthorizedSession()
  const userId = session.userId

  if (!userId) {
    throw new Error("You must be logged in to delete this study")
  }

  const pi = await db.studyResearcher.findFirst({
    where: { studyId, userId, role: "PI" },
  })

  if (!pi) {
    throw new Error("You are not authorized to delete this study")
  }

  await assertStudyDeleteAllowedByResponses(studyId)
  await deletePlatformStudyFromJatos({ studyId, actingUserId: userId, mode: "pi" })
  await db.study.delete({ where: { id: studyId } })

  return { id: studyId }
}

export async function updateStudyStatus(input: { studyId: number; status: "OPEN" | "CLOSED" }) {
  const session = await getAuthorizedSession()
  const userId = session.userId

  if (!userId) {
    throw new Error("Not authenticated")
  }

  const researcher = await db.studyResearcher.findFirst({
    where: { studyId: input.studyId, userId },
  })

  if (!researcher) {
    throw new Error("You are not authorized to modify this study.")
  }

  const existingStudy = await db.study.findUnique({
    where: { id: input.studyId },
    select: {
      id: true,
      status: true,
      title: true,
      adminApproved: true,
      archived: true,
    },
  })

  if (!existingStudy) {
    throw new Error("Study not found.")
  }

  if (existingStudy.status === input.status) {
    return existingStudy
  }

  await assertStudyNotArchived(existingStudy)

  if (input.status === "OPEN" && existingStudy.adminApproved !== true) {
    throw new Error(
      "Study must be approved by an administrator before data collection can be launched."
    )
  }

  const study = await db.study.update({
    where: { id: input.studyId },
    data: { status: input.status },
    select: {
      id: true,
      title: true,
      status: true,
    },
  })

  if (input.status === "OPEN" && existingStudy.status !== "OPEN") {
    const researcherIds = await db.studyResearcher.findMany({
      where: { studyId: input.studyId },
      select: { userId: true },
    })

    const recipientIds = researcherIds.map((item) => item.userId)

    if (recipientIds.length > 0) {
      const setupCompletedAt = new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date())

      await sendNotification({
        templateId: "studySetupCompleted",
        recipients: recipientIds,
        data: {
          studyTitle: existingStudy.title ?? study.title,
          setupCompletedAt,
          nextStep: "You can now invite participants and monitor their progress.",
        },
        routeData: {
          path: "/studies/[studyId]",
          params: { studyId: input.studyId },
        },
        studyId: input.studyId,
      })
    }
  }

  return study
}
