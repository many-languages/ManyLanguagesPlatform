"use server"

import { revalidateTag } from "next/cache"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { NOTIFICATIONS_MENU_TAG, NOTIFICATIONS_TABLE_TAG } from "../constants"

export const deleteNotifications = async (notificationIds: number[]) => {
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return { deleted: 0 }
  }

  const session = await getAuthorizedSession()

  const { count } = await db.notificationRecipient.deleteMany({
    where: {
      userId: session.userId!,
      notificationId: { in: notificationIds },
    },
  })

  // Optionally clean up orphaned notifications
  await db.notification.deleteMany({
    where: {
      id: { in: notificationIds },
      recipients: {
        none: {},
      },
    },
  })

  revalidateTag(NOTIFICATIONS_MENU_TAG)
  revalidateTag(NOTIFICATIONS_TABLE_TAG)

  return { deleted: count }
}
