import { NotFoundError } from "blitz"
import db from "db"
import type { z } from "zod"
import { UpdateProfile } from "../validations"

type UpdateProfileInput = z.infer<typeof UpdateProfile>

export async function updateProfileForUser(userId: number, data: UpdateProfileInput) {
  const user = await db.user.findFirst({ where: { id: userId } })
  if (!user) throw new NotFoundError()

  await db.user.update({
    where: { id: user.id },
    data: {
      firstname: data.firstname,
      lastname: data.lastname,
      username: data.username,
    },
  })

  return true
}
