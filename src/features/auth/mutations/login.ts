import { resolver } from "@blitzjs/rpc"
import { loginUser } from "../server/login"
import { Login } from "../validations"

export default resolver.pipe(resolver.zod(Login), async (input, ctx) => {
  return loginUser(input, ctx.session)
})
