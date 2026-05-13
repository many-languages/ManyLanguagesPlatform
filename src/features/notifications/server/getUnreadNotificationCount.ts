import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"
import db from "db"

export async function getUnreadNotificationCountForUser(userId: number): Promise<number> {
  return db.notificationRecipient.count({
    where: {
      userId,
      readAt: null,
      dismissedAt: null,
    },
  })
}

export const getUnreadNotificationCountRsc = cache(async () => {
  const { session } = await getBlitzContext()
  if (!session.userId) return 0

  return getUnreadNotificationCountForUser(session.userId)
})
