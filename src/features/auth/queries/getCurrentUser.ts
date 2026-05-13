import { Ctx } from "blitz"
import { findCurrentUserById } from "../server/getCurrentUser"

export default async function getCurrentUser(_: null, ctx: Ctx) {
  if (!ctx.session.userId) return null
  return findCurrentUserById(ctx.session.userId)
}
