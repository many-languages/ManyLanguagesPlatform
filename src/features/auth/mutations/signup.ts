import { resolver } from "@blitzjs/rpc"
import { signupUser } from "../server/signup"
import { SignupWithAdminInvite } from "../validations"

export default resolver.pipe(resolver.zod(SignupWithAdminInvite), async (input, ctx) => {
  return signupUser(input, ctx.session)
})
