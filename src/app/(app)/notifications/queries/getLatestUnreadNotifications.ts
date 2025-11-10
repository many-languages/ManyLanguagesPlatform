import { Ctx } from "blitz"
import db from "db"

export default async function getLatestUnreadNotifications(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()

  return db.notificationRecipient.findMany({
    where: {
      userId: ctx.session.userId!,
      readAt: null,
      dismissedAt: null,
    },
    include: {
      notification: true,
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 3,
  })
}
