import { Ctx } from "blitz"
import { findNotificationsForUser, type GetNotificationsInput } from "../server/getNotifications"

export default async function getNotificationsForUser(input: GetNotificationsInput, ctx: Ctx) {
  ctx.session.$authorize()

  return findNotificationsForUser(ctx.session.userId, input)
}
