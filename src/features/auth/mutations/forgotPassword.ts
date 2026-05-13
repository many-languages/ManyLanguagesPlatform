import { resolver } from "@blitzjs/rpc"
import { requestPasswordReset } from "../server/forgotPassword"
import { ForgotPassword } from "../validations"

export default resolver.pipe(resolver.zod(ForgotPassword), async (input) => {
  return requestPasswordReset(input)
})
