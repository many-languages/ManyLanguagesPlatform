"use server"

import { revalidateTag } from "next/cache"
import db from "db"
import { getAuthorizedSession } from "@/src/lib/auth/session"
import { NOTIFICATIONS_MENU_TAG, NOTIFICATIONS_TABLE_TAG } from "../constants"
import { NotificationIdsInput } from "../validations"

export const markNotificationsUnread = async (notificationIds: number[]) => {
  if (notificationIds.length === 0) {
    return { updated: 0 }
  }

  const parsed = NotificationIdsInput.safeParse(notificationIds)
  if (!parsed.success) {
    return { updated: 0 }
  }

  const session = await getAuthorizedSession()

  const count = await db.notificationRecipient.updateMany({
    where: {
      userId: session.userId!,
      notificationId: { in: parsed.data },
    },
    data: {
      readAt: null,
    },
  })

  revalidateTag(NOTIFICATIONS_MENU_TAG)
  revalidateTag(NOTIFICATIONS_TABLE_TAG)

  return { updated: count.count }
}
