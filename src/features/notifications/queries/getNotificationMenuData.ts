import { Ctx } from "blitz"
import { getAuthorizedUserId } from "@/src/lib/auth/getAuthorizedUserId"
import { getNotificationMenuDataForUser } from "../server/getNotificationMenuData"
import { notificationAudienceForRole } from "../utils/audience"

export default async function getNotificationMenuData(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()
  return getNotificationMenuDataForUser(
    getAuthorizedUserId(ctx.session),
    notificationAudienceForRole(ctx.session.role)
  )
}
