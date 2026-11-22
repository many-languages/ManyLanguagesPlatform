// Removed "use server" to keep Blitz RPC conventions clear

import { resolver } from "@blitzjs/rpc"
import { AcceptAdminInviteSchema } from "../validations"
import { acceptAdminInvite } from "../server/acceptAdminInvite"

// Any logged-in user may call this; the server helper decides whether their account and token qualify.
export default resolver.pipe(
  resolver.zod(AcceptAdminInviteSchema),
  resolver.authorize(),
  async (input, ctx) => acceptAdminInvite(input, ctx.session)
)
