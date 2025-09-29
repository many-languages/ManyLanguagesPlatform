import { NotFoundError } from "blitz"
import db from "db"
import { resolver } from "@blitzjs/rpc"
import { SecurePassword } from "@blitzjs/auth/secure-password"
import { UpdateProfile } from "../validations"

export default resolver.pipe(
  resolver.zod(UpdateProfile),
  resolver.authorize(),
  async ({ firstname, lastname, username }, ctx) => {
    const user = await db.user.findFirst({ where: { id: ctx.session.userId } })
    if (!user) throw new NotFoundError()
    await db.user.update({
      where: { id: user.id },
      data: { firstname: firstname, lastname: lastname, username: username },
    })

    return true
  }
)
