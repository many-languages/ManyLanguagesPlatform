import { resolver } from "@blitzjs/rpc"
import { switchActiveRole } from "../server/switchActiveRole"
import { SwitchActiveRole } from "../validations"

export default resolver.pipe(
  resolver.zod(SwitchActiveRole),
  resolver.authorize(),
  async (input, ctx) => switchActiveRole(input, ctx.session)
)
