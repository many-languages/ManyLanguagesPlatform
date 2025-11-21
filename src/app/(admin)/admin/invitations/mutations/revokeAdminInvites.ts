"use server"

import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const RevokeAdminInvitesSchema = z.object({
  inviteIds: z.array(z.number()).min(1, "Select at least one invite"),
})

const revokeAdminInvites = resolver.pipe(
  resolver.zod(RevokeAdminInvitesSchema),
  resolver.authorize("ADMIN"),
  async ({ inviteIds }) => {
    const now = new Date()

    const result = await db.adminInvite.updateMany({
      where: { id: { in: inviteIds }, revokedAt: null },
      data: {
        revokedAt: now,
      },
    })

    return { revoked: result.count }
  }
)

export default revokeAdminInvites
