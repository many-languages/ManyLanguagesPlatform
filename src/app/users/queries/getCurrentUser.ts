import { Ctx } from "blitz"
import db from "db"

export default async function getCurrentUser(_: null, ctx: Ctx) {
  if (!ctx.session.userId) return null
  const user = await db.user.findFirst({
    where: { id: ctx.session.userId },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      username: true,
      email: true,
      role: true,
      gravatar: true,
      createdAt: true,
    },
  })

  return user
}
