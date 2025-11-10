import { Ctx } from "blitz"
import db from "db"

export default async function getUnreadNotificationCount(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()

  return db.notificationRecipient.count({
    where: {
      userId: ctx.session.userId!,
      readAt: null,
      dismissedAt: null,
    },
  })
}
