// Removed "use server" to keep Blitz RPC conventions clear

import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { getAdminInviteEmailStatus } from "../server/getAdminInviteEmailStatus"

const GetAdminInviteEmailStatus = z.object({
  email: z.string().email(),
})

export default resolver.pipe(
  resolver.zod(GetAdminInviteEmailStatus),
  resolver.authorize("SUPERADMIN"),
  async ({ email }) => getAdminInviteEmailStatus(email)
)
