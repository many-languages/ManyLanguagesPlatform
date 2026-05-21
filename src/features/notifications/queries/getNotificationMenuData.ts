import { Ctx } from "blitz"
import { getAuthorizedUserId } from "@/src/lib/auth/getAuthorizedUserId"
import { getNotificationMenuDataForUser } from "../server/getNotificationMenuData"

export default async function getNotificationMenuData(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()
  return getNotificationMenuDataForUser(getAuthorizedUserId(ctx.session))
}
