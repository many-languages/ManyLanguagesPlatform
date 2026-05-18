import { Ctx } from "blitz"
import { getNotificationMenuDataForUser } from "../server/getNotificationMenuData"

export default async function getNotificationMenuData(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()
  return getNotificationMenuDataForUser(ctx.session.userId!)
}
