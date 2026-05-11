import { NotFoundError } from "blitz"
import { resolver } from "@blitzjs/rpc"
import { UpdateProfile } from "../validations"
import { updateProfileForUser } from "../server/updateProfile"

export default resolver.pipe(
  resolver.zod(UpdateProfile),
  resolver.authorize(),
  async ({ firstname, lastname, username }, ctx) => {
    if (!ctx.session.userId) throw new NotFoundError()
    return updateProfileForUser(ctx.session.userId, { firstname, lastname, username })
  }
)
