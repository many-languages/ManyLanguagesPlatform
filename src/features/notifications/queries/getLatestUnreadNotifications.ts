import { Ctx } from "blitz"
import { findLatestUnreadNotificationsForUser } from "../server/getLatestUnreadNotifications"

export default async function getLatestUnreadNotifications(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()

  return findLatestUnreadNotificationsForUser(ctx.session.userId!)
}
