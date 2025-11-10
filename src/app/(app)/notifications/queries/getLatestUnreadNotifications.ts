import { Ctx } from "blitz"
import db from "db"
import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"

export type GetLatestUnreadNotificationsInput = {
  take?: number
  includeDismissed?: boolean
}

const DEFAULT_TAKE = 3

async function findLatestUnreadNotifications(
  userId: number,
  input: GetLatestUnreadNotificationsInput = {}
) {
  const { includeDismissed = false, take = DEFAULT_TAKE } = input

  return db.notificationRecipient.findMany({
    where: {
      userId,
      readAt: null,
      ...(includeDismissed ? {} : { dismissedAt: null }),
    },
    include: {
      notification: true,
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take,
  })
}

export const getLatestUnreadNotificationsRsc = cache(
  async (input: GetLatestUnreadNotificationsInput = {}) => {
    const { session } = await getBlitzContext()
    if (!session.userId) return []

    return findLatestUnreadNotifications(session.userId, input)
  }
)

export default async function getLatestUnreadNotifications(
  input: GetLatestUnreadNotificationsInput,
  ctx: Ctx
) {
  ctx.session.$authorize()

  return findLatestUnreadNotifications(ctx.session.userId, input)
}
