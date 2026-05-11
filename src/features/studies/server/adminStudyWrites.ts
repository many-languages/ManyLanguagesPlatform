import { AuthorizationError } from "blitz"
import db from "db"
import type { UserRole } from "@/db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { sendNotification } from "@/src/features/notifications"
import { deleteStudyAsAdmin } from "@/src/lib/jatos/admin/deleteStudyWorkflow"
import { isStaffAdmin, isSuperAdmin } from "@/src/lib/auth/roles"
import { isSetupComplete, type StudyWithMinimalRelations } from "../domain/setup/setupStatus"
import { studyHasParticipantResponsesSafe } from "./participantResponses"

async function requireStaffAdminSession() {
  const session = await getAuthorizedSession()

  if (!isStaffAdmin(session.role)) {
    throw new AuthorizationError()
  }

  return session
}

function formatChangedAt(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export async function approveStudy(studyIds: number[]) {
  const session = await requireStaffAdminSession()
  const now = new Date()

  const studies = await db.study.findMany({
    where: { id: { in: studyIds } },
    include: { researchers: { select: { userId: true } } },
  })

  const result = await db.study.updateMany({
    where: { id: { in: studyIds } },
    data: {
      adminApproved: true,
      adminReviewedAt: now,
      adminReviewedById: session.userId ?? undefined,
    },
  })

  const reviewedAt = formatChangedAt(now)

  for (const study of studies) {
    const researcherIds = study.researchers.map((researcher) => researcher.userId)
    if (researcherIds.length > 0) {
      await sendNotification({
        templateId: "adminStudyApproved",
        recipients: researcherIds,
        data: { studyTitle: study.title, reviewedAt },
        routeData: {
          path: "/studies/[studyId]",
          params: { studyId: study.id },
        },
        studyId: study.id,
      })
    }
  }

  return { updated: result.count }
}

export async function rejectStudy(studyIds: number[]) {
  const session = await requireStaffAdminSession()
  const now = new Date()

  const studies = await db.study.findMany({
    where: { id: { in: studyIds } },
    include: { researchers: { select: { userId: true } } },
  })

  const result = await db.study.updateMany({
    where: { id: { in: studyIds } },
    data: {
      adminApproved: false,
      adminReviewedAt: now,
      adminReviewedById: session.userId ?? undefined,
    },
  })

  const reviewedAt = formatChangedAt(now)

  for (const study of studies) {
    const researcherIds = study.researchers.map((researcher) => researcher.userId)
    if (researcherIds.length > 0) {
      await sendNotification({
        templateId: "adminStudyRejected",
        recipients: researcherIds,
        data: { studyTitle: study.title, reviewedAt },
        routeData: {
          path: "/studies/[studyId]",
          params: { studyId: study.id },
        },
        studyId: study.id,
      })
    }
  }

  return { updated: result.count }
}

export async function enableDataCollection(studyIds: number[]) {
  await requireStaffAdminSession()

  const studies = await db.study.findMany({
    where: { id: { in: studyIds } },
    include: {
      researchers: { select: { userId: true } },
      jatosStudyUploads: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  const studiesWithLatestUpload = studies.map((study) => ({
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }))

  const invalidStudies = studiesWithLatestUpload.filter(
    (study) => study.adminApproved !== true || !isSetupComplete(study as StudyWithMinimalRelations)
  )

  if (invalidStudies.length > 0) {
    const titles = invalidStudies
      .map((study) => study.title?.trim() || `Study #${study.id}`)
      .join(", ")

    throw new Error(
      `Cannot enable data collection. The following studies need admin approval and completed setup: ${titles}`
    )
  }

  const result = await db.study.updateMany({
    where: { id: { in: studyIds } },
    data: { status: "OPEN" },
  })

  const changedAt = formatChangedAt(new Date())

  for (const study of studies) {
    const researcherIds = study.researchers.map((researcher) => researcher.userId)
    if (researcherIds.length > 0) {
      await sendNotification({
        templateId: "dataCollectionStatusChanged",
        recipients: researcherIds,
        data: {
          studyTitle: study.title,
          status: "enabled",
          changedAt,
        },
        routeData: {
          path: "/studies/[studyId]",
          params: { studyId: study.id },
        },
        studyId: study.id,
      })
    }
  }

  return { updated: result.count }
}

export async function disableDataCollection(studyIds: number[]) {
  await requireStaffAdminSession()

  const studies = await db.study.findMany({
    where: { id: { in: studyIds } },
    include: {
      researchers: { select: { userId: true } },
    },
  })

  const result = await db.study.updateMany({
    where: { id: { in: studyIds } },
    data: { status: "CLOSED" },
  })

  const changedAt = formatChangedAt(new Date())

  for (const study of studies) {
    const researcherIds = study.researchers.map((researcher) => researcher.userId)
    if (researcherIds.length > 0) {
      await sendNotification({
        templateId: "dataCollectionStatusChanged",
        recipients: researcherIds,
        data: {
          studyTitle: study.title,
          status: "disabled",
          changedAt,
        },
        routeData: {
          path: "/studies/[studyId]",
          params: { studyId: study.id },
        },
        studyId: study.id,
      })
    }
  }

  return { updated: result.count }
}

export async function deleteStudy(input: { studyIds: number[]; reason: string }) {
  const session = await requireStaffAdminSession()
  const adminUserId = session.userId

  if (!adminUserId) {
    throw new Error("Not authenticated")
  }

  const role = session.role as UserRole
  const superadmin = isSuperAdmin(role)

  const studies = await db.study.findMany({
    where: { id: { in: input.studyIds } },
    include: {
      FeedbackTemplate: true,
      researchers: { select: { userId: true } },
      jatosStudyUploads: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  })

  if (studies.length !== input.studyIds.length) {
    throw new Error("One or more studies were not found.")
  }

  for (const study of studies) {
    const hasResponsesSafe = await studyHasParticipantResponsesSafe(study.id)
    if (hasResponsesSafe === null) {
      throw new Error(
        "Could not verify participant response data for one or more studies. Please try again later."
      )
    }

    const title = study.title?.trim() || `Study #${study.id}`

    if (hasResponsesSafe && !study.archived) {
      throw new Error(
        `Cannot delete: studies with participant responses must be archived first. Affected: ${title}`
      )
    }

    if (hasResponsesSafe && study.archived && !superadmin) {
      throw new Error(
        `Cannot delete: archived studies with participant responses may only be removed by a superadmin. Affected: ${title}`
      )
    }
  }

  const idsToDelete = studies.map((study) => study.id)

  for (const study of studies) {
    await deleteStudyAsAdmin({
      studyId: study.id,
      adminUserId,
      reason: input.reason,
    })
  }

  const result = await db.study.deleteMany({
    where: { id: { in: idsToDelete } },
  })

  return { updated: result.count }
}
