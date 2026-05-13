import { Ctx } from "blitz"
import { logoutCurrentUser } from "../server/logout"

export default async function logout(_: unknown, ctx: Ctx) {
  return logoutCurrentUser(ctx.session)
}
