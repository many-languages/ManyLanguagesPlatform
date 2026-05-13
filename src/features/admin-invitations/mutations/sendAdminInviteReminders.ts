"use server"

import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { sendAdminInviteReminders } from "../server/sendAdminInviteReminders"

const SendAdminInviteReminders = z.object({
  inviteIds: z.array(z.number()).min(1, "Select at least one invite"),
})

export default resolver.pipe(
  resolver.zod(SendAdminInviteReminders),
  resolver.authorize("SUPERADMIN"),
  async ({ inviteIds }) => sendAdminInviteReminders(inviteIds)
)
