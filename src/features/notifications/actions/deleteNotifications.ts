"use server"

import { revalidateTag } from "next/cache"
import db from "db"
import { getAuthorizedUserId } from "@/src/lib/auth/getAuthorizedUserId"
import { getAuthorizedSession } from "@/src/lib/auth/session"
import { NOTIFICATIONS_MENU_TAG, NOTIFICATIONS_TABLE_TAG } from "../constants"
import { NotificationIdsInput } from "../validations"

export const deleteNotifications = async (notificationIds: number[]) => {
  if (notificationIds.length === 0) {
    return { deleted: 0 }
  }

  const parsed = NotificationIdsInput.safeParse(notificationIds)
  if (!parsed.success) {
    return { deleted: 0 }
  }

  const session = await getAuthorizedSession()
  const userId = getAuthorizedUserId(session)

  const { count } = await db.notificationRecipient.deleteMany({
    where: {
      userId,
      notificationId: { in: parsed.data },
    },
  })

  // Optionally clean up orphaned notifications
  await db.notification.deleteMany({
    where: {
      id: { in: parsed.data },
      recipients: {
        none: {},
      },
    },
  })

  revalidateTag(NOTIFICATIONS_MENU_TAG)
  revalidateTag(NOTIFICATIONS_TABLE_TAG)

  return { deleted: count }
}
