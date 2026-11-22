import type { NotificationAudience } from "@prisma/client"
import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"
import db from "db"
import { notificationAudienceForRole } from "../utils/audience"

export async function getUnreadNotificationCountForUser(
  userId: number,
  audience: NotificationAudience
): Promise<number> {
  return db.notificationRecipient.count({
    where: {
      userId,
      readAt: null,
      dismissedAt: null,
      notification: { audience },
    },
  })
}

export const getUnreadNotificationCountRsc = cache(async () => {
  const { session } = await getBlitzContext()
  if (!session.userId) return 0

  return getUnreadNotificationCountForUser(
    session.userId,
    notificationAudienceForRole(session.role)
  )
})
