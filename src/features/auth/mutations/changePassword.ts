import { resolver } from "@blitzjs/rpc"
import { changePassword } from "../server/changePassword"
import { ChangePassword } from "../validations"

export default resolver.pipe(
  resolver.zod(ChangePassword),
  resolver.authorize(),
  async (input, ctx) => {
    return changePassword(input, ctx.session)
  }
)
