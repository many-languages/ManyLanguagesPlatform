"use server"

import { resolver } from "@blitzjs/rpc"
import { RevokeAdminInvitesSchema } from "../validations"
import { revokeAdminInvites as revokeAdminInvitesForIds } from "../server/revokeAdminInvites"

const revokeAdminInvites = resolver.pipe(
  resolver.zod(RevokeAdminInvitesSchema),
  resolver.authorize("SUPERADMIN"),
  async ({ inviteIds }) => revokeAdminInvitesForIds(inviteIds)
)

export default revokeAdminInvites
