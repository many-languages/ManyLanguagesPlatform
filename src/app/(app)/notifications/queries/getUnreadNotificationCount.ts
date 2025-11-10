import { Ctx } from "blitz"
import db from "db"
import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"

export type GetUnreadNotificationCountInput = {
  includeDismissed?: boolean
}

async function countUnreadNotifications(
  userId: number,
  input: GetUnreadNotificationCountInput = {}
) {
  const { includeDismissed = false } = input

  return db.notificationRecipient.count({
    where: {
      userId,
      readAt: null,
      ...(includeDismissed ? {} : { dismissedAt: null }),
    },
  })
}

export const getUnreadNotificationCountRsc = cache(
  async (input: GetUnreadNotificationCountInput = {}) => {
    const { session } = await getBlitzContext()
    if (!session.userId) return 0

    return countUnreadNotifications(session.userId, input)
  }
)

export default async function getUnreadNotificationCount(
  input: GetUnreadNotificationCountInput,
  ctx: Ctx
) {
  ctx.session.$authorize()

  return countUnreadNotifications(ctx.session.userId, input)
}
