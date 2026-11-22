import type { NotificationAudience } from "@prisma/client"
import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"
import db from "db"
import { notificationRecipientWithNotificationSelect } from "../notificationSelects"
import type { NotificationWithRecipient } from "../types"
import { notificationAudienceForRole } from "../utils/audience"

export async function findLatestUnreadNotificationsForUser(
  userId: number,
  audience: NotificationAudience
): Promise<NotificationWithRecipient[]> {
  return db.notificationRecipient.findMany({
    where: {
      userId,
      readAt: null,
      dismissedAt: null,
      notification: { audience },
    },
    select: notificationRecipientWithNotificationSelect,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 3,
  })
}

export const getLatestUnreadNotificationsRsc = cache(async () => {
  const { session } = await getBlitzContext()
  if (!session.userId) return []

  return findLatestUnreadNotificationsForUser(
    session.userId,
    notificationAudienceForRole(session.role)
  )
})
