"use server"

import { revalidateTag } from "next/cache"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { NOTIFICATIONS_MENU_TAG, NOTIFICATIONS_TABLE_TAG } from "../constants"

export const markNotificationsUnread = async (notificationIds: number[]) => {
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return { updated: 0 }
  }

  const session = await getAuthorizedSession()

  const count = await db.notificationRecipient.updateMany({
    where: {
      userId: session.userId!,
      notificationId: { in: notificationIds },
    },
    data: {
      readAt: null,
    },
  })

  revalidateTag(NOTIFICATIONS_MENU_TAG)
  revalidateTag(NOTIFICATIONS_TABLE_TAG)

  return { updated: count.count }
}
