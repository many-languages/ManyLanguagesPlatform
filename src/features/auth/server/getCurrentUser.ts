import db from "db"
import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"
import { currentUserSelect, type CurrentUserFromSession } from "../currentUserSelect"

export async function findCurrentUserById(userId: number): Promise<CurrentUserFromSession | null> {
  return db.user.findFirst({
    where: { id: userId },
    select: currentUserSelect,
  })
}

export const getCurrentUserRsc = cache(async () => {
  const { session } = await getBlitzContext()
  if (!session.userId) return null

  return findCurrentUserById(session.userId)
})
