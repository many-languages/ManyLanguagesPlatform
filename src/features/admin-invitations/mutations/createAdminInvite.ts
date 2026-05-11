"use server"

import { resolver } from "@blitzjs/rpc"
import { createAdminInviteInputSchema } from "../validations"
import { createAdminInvite } from "../server/createAdminInvite"

export default resolver.pipe(
  resolver.zod(createAdminInviteInputSchema),
  resolver.authorize("SUPERADMIN"),
  async (input) => createAdminInvite(input)
)
