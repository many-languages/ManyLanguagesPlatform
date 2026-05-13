import { Ctx } from "blitz"
import { getUnreadNotificationCountForUser } from "../server/getUnreadNotificationCount"

export default async function getUnreadNotificationCount(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()

  return getUnreadNotificationCountForUser(ctx.session.userId!)
}
