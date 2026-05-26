import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"
import db from "db"
import { notificationRecipientWithNotificationSelect } from "../notificationSelects"
import type { NotificationWithRecipient } from "../types"

export async function findLatestUnreadNotificationsForUser(
  userId: number
): Promise<NotificationWithRecipient[]> {
  return db.notificationRecipient.findMany({
    where: {
      userId,
      readAt: null,
      dismissedAt: null,
    },
    select: notificationRecipientWithNotificationSelect,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 3,
  })
}

export const getLatestUnreadNotificationsRsc = cache(async () => {
  const { session } = await getBlitzContext()
  if (!session.userId) return []

  return findLatestUnreadNotificationsForUser(session.userId)
})
