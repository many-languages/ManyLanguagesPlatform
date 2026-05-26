// Removed "use server" to keep Blitz RPC conventions clear

import { resolver } from "@blitzjs/rpc"
import { SendAdminInviteRemindersSchema } from "../validations"
import { sendAdminInviteReminders } from "../server/sendAdminInviteReminders"

export default resolver.pipe(
  resolver.zod(SendAdminInviteRemindersSchema),
  resolver.authorize("SUPERADMIN"),
  async ({ inviteIds }) => sendAdminInviteReminders(inviteIds)
)
