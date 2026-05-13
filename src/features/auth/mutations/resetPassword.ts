import { resolver } from "@blitzjs/rpc"
import { resetPassword } from "../server/resetPassword"
import { ResetPassword } from "../validations"

export default resolver.pipe(resolver.zod(ResetPassword), async (input, ctx) => {
  return resetPassword(input, ctx.session)
})
