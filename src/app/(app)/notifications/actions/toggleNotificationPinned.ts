"use server"

import { revalidateTag } from "next/cache"
import db from "db"

import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { NOTIFICATIONS_MENU_TAG, NOTIFICATIONS_TABLE_TAG } from "../constants"

type ToggleNotificationPinnedInput = {
  notificationId: number
  pinned: boolean
}

export const toggleNotificationPinned = async ({
  notificationId,
  pinned,
}: ToggleNotificationPinnedInput) => {
  const session = await getAuthorizedSession()

  await db.notificationRecipient.update({
    where: {
      notificationId_userId: {
        notificationId,
        userId: session.userId!,
      },
    },
    data: {
      pinned,
    },
  })

  revalidateTag(NOTIFICATIONS_MENU_TAG)
  revalidateTag(NOTIFICATIONS_TABLE_TAG)
}
