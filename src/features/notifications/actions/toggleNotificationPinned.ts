"use server"

import { revalidateTag } from "next/cache"
import db from "db"

import { getAuthorizedSession, getAuthorizedUserId } from "@/src/lib/auth/session"
import { NOTIFICATIONS_MENU_TAG, NOTIFICATIONS_TABLE_TAG } from "../constants"
import { ToggleNotificationPinnedSchema } from "../validations"

export const toggleNotificationPinned = async (input: unknown) => {
  const { notificationId, pinned } = ToggleNotificationPinnedSchema.parse(input)

  const session = await getAuthorizedSession()
  const userId = getAuthorizedUserId(session)

  await db.notificationRecipient.update({
    where: {
      notificationId_userId: {
        notificationId,
        userId,
      },
    },
    data: {
      pinned,
    },
  })

  revalidateTag(NOTIFICATIONS_MENU_TAG)
  revalidateTag(NOTIFICATIONS_TABLE_TAG)
}
