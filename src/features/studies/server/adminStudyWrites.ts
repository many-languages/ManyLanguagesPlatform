import { AuthorizationError } from "blitz"
import db from "db"
import type { UserRole } from "@/db"
import { getAuthorizedSession } from "@/src/lib/auth/session"
import { sendNotification } from "@/src/features/notifications"
import { deleteStudyAsAdmin } from "@/src/lib/jatos/admin/deleteStudyWorkflow"
import { isStaffAdmin, isSuperAdmin } from "@/src/lib/auth/roles"
import { recordAdminAuditEvent } from "@/src/lib/audit/adminAudit"
import { isSetupComplete, toSetupStatusStudy } from "../domain/setup/setupStatus"
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

function normalizeAuditReason(reason: string): string {
  return reason.trim().slice(0, 2000)
}

function deletionAuditMetadata(input: {
  reason: string
  study: {
    title: string
    archived: boolean
    jatosStudyUUID: string | null
    jatosStudyUploads: Array<{ jatosStudyId: number; id: number; versionNumber: number }>
  }
  hasParticipantResponses: boolean
}) {
  const latestUpload = input.study.jatosStudyUploads[0] ?? null

  return {
    reason: normalizeAuditReason(input.reason),
    studyTitle: input.study.title,
    archived: input.study.archived,
    hasParticipantResponses: input.hasParticipantResponses,
    jatosStudyUUID: input.study.jatosStudyUUID,
    jatosStudyUploadId: latestUpload?.id ?? null,
    jatosStudyId: latestUpload?.jatosStudyId ?? null,
    jatosUploadVersionNumber: latestUpload?.versionNumber ?? null,
  }
}

function studyAuditMetadata(input: {
  study: { title: string; status?: string; adminApproved?: boolean | null }
  previousStatus?: string
  newStatus?: string
  newAdminApproved?: boolean | null
  reviewedAt?: Date
  changedAt?: Date
}) {
  return {
    studyTitle: input.study.title,
    previousStatus: input.previousStatus ?? null,
    newStatus: input.newStatus ?? null,
    previousAdminApproved: input.study.adminApproved,
    newAdminApproved: input.newAdminApproved ?? null,
    reviewedAt: input.reviewedAt?.toISOString() ?? null,
    changedAt: input.changedAt?.toISOString() ?? null,
  }
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
    await recordAdminAuditEvent({
      actorUserId: session.userId,
      actorRole: session.role,
      event: "admin_study_approved",
      entityType: "Study",
      entityId: study.id,
      metadata: studyAuditMetadata({ study, reviewedAt: now, newAdminApproved: true }),
    })

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
    await recordAdminAuditEvent({
      actorUserId: session.userId,
      actorRole: session.role,
      event: "admin_study_rejected",
      entityType: "Study",
      entityId: study.id,
      metadata: studyAuditMetadata({ study, reviewedAt: now, newAdminApproved: false }),
    })

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
  const session = await requireStaffAdminSession()

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
    (study) => study.adminApproved !== true || !isSetupComplete(toSetupStatusStudy(study))
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

  const changedAtDate = new Date()
  const changedAt = formatChangedAt(changedAtDate)

  for (const study of studies) {
    await recordAdminAuditEvent({
      actorUserId: session.userId,
      actorRole: session.role,
      event: "data_collection_enabled",
      entityType: "Study",
      entityId: study.id,
      metadata: studyAuditMetadata({
        study,
        previousStatus: study.status,
        newStatus: "OPEN",
        changedAt: changedAtDate,
      }),
    })

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
  const session = await requireStaffAdminSession()

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

  const changedAtDate = new Date()
  const changedAt = formatChangedAt(changedAtDate)

  for (const study of studies) {
    await recordAdminAuditEvent({
      actorUserId: session.userId,
      actorRole: session.role,
      event: "data_collection_disabled",
      entityType: "Study",
      entityId: study.id,
      metadata: studyAuditMetadata({
        study,
        previousStatus: study.status,
        newStatus: "CLOSED",
        changedAt: changedAtDate,
      }),
    })

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

  const deletionTargets: Array<{
    study: (typeof studies)[number]
    hasParticipantResponses: boolean
  }> = []

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

    deletionTargets.push({ study, hasParticipantResponses: hasResponsesSafe })
  }

  const idsToDelete = studies.map((study) => study.id)

  for (const { study, hasParticipantResponses } of deletionTargets) {
    const metadata = deletionAuditMetadata({
      reason: input.reason,
      study,
      hasParticipantResponses,
    })

    await recordAdminAuditEvent({
      actorUserId: adminUserId,
      actorRole: role,
      event: "study_deletion_requested",
      entityType: "Study",
      entityId: study.id,
      metadata,
    })

    try {
      await deleteStudyAsAdmin({
        studyId: study.id,
        adminUserId,
        reason: input.reason,
      })
    } catch (error) {
      await recordAdminAuditEvent({
        actorUserId: adminUserId,
        actorRole: role,
        event: "jatos_deletion_failed",
        entityType: "Study",
        entityId: study.id,
        metadata: {
          ...metadata,
          errorName: error instanceof Error ? error.name : typeof error,
        },
      })
      throw error
    }
  }

  const result = await db.study.deleteMany({
    where: { id: { in: idsToDelete } },
  })

  for (const { study, hasParticipantResponses } of deletionTargets) {
    await recordAdminAuditEvent({
      actorUserId: adminUserId,
      actorRole: role,
      event: "study_deleted",
      entityType: "Study",
      entityId: study.id,
      metadata: deletionAuditMetadata({
        reason: input.reason,
        study,
        hasParticipantResponses,
      }),
    })
  }

  return { updated: result.count }
}
