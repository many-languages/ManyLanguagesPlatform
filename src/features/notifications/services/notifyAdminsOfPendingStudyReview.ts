"use server"

import db from "db"

import { staffAdminUsersWhere } from "@/src/lib/auth/roles"
import { sendNotification } from "./sendNotification"

type NotifyAdminsOfPendingStudyReviewInput = {
  studyId: number
  studyTitle: string
}

/**
 * Admin-to-admin push notification: sent when a researcher-submitted study enters the admin
 * review queue (i.e. setup just became complete, a FeedbackTemplate exists, and the study has
 * not been admin-approved yet).
 *
 * Recipients: every user holding the ADMIN or SUPERADMIN role (even while they are currently
 * acting as a researcher), except researchers on the study itself — they cannot review their own
 * study, so the notification would only be noise for them.
 *
 * No-op when there is no admin who could review the study.
 */
export const notifyAdminsOfPendingStudyReview = async ({
  studyId,
  studyTitle,
}: NotifyAdminsOfPendingStudyReviewInput) => {
  const studyResearchers = await db.studyResearcher.findMany({
    where: { studyId },
    select: { userId: true },
  })

  const admins = await db.user.findMany({
    where: {
      ...staffAdminUsersWhere(),
      id: { notIn: studyResearchers.map((researcher) => researcher.userId) },
    },
    select: { id: true },
  })

  const recipientIds = admins.map((a) => a.id)
  if (recipientIds.length === 0) {
    return null
  }

  const submittedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date())

  return sendNotification({
    templateId: "newStudyPendingAdminReview",
    recipients: recipientIds,
    data: { studyTitle, submittedAt },
    routeData: {
      path: "/admin/studies",
    },
    studyId,
    audience: "ADMIN",
  })
}
