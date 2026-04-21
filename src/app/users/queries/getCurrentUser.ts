import { Ctx } from "blitz"
import type { Prisma } from "@prisma/client"
import db from "db"
import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"

/** Shared with Prisma inference — keep in sync with `findCurrentUser`. */
export const currentUserSelect = {
  id: true,
  firstname: true,
  lastname: true,
  username: true,
  email: true,
  role: true,
  gravatar: true,
  createdAt: true,
  language: true,
} satisfies Prisma.UserSelect

export type CurrentUserFromSession = Prisma.UserGetPayload<{ select: typeof currentUserSelect }>

// Core database function
async function findCurrentUser(userId: number) {
  const user = await db.user.findFirst({
    where: { id: userId },
    select: currentUserSelect,
  })

  return user
}

// Server-side helper for RSCs
export const getCurrentUserRsc = cache(async () => {
  const { session } = await getBlitzContext()
  if (!session.userId) return null

  return findCurrentUser(session.userId)
})

// Blitz query for client usage
export default async function getCurrentUser(_: null, ctx: Ctx) {
  if (!ctx.session.userId) return null
  return findCurrentUser(ctx.session.userId)
}
