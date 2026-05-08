"use server"

import db from "db"

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
 * Recipients: every user with role ADMIN or SUPERADMIN. We notify the submitter? Admins who
 * are also researchers on the study still receive it — cross-role researcher/admin accounts are
 * unusual and admins can delete noise from their own feed.
 *
 * No-op when there are no admin users.
 */
export const notifyAdminsOfPendingStudyReview = async ({
  studyId,
  studyTitle,
}: NotifyAdminsOfPendingStudyReviewInput) => {
  const admins = await db.user.findMany({
    where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
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
  })
}
