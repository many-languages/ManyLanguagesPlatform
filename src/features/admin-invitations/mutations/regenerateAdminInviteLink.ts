// Removed "use server" to keep Blitz RPC conventions clear

import { resolver } from "@blitzjs/rpc"
import { RegenerateAdminInviteLinkSchema } from "../validations"
import { regenerateAdminInviteLink } from "../server/regenerateAdminInviteLink"

export default resolver.pipe(
  resolver.zod(RegenerateAdminInviteLinkSchema),
  resolver.authorize("SUPERADMIN"),
  async ({ inviteId }) => regenerateAdminInviteLink(inviteId)
)
