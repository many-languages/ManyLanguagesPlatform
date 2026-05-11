"use server"

import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { validateAdminInviteToken } from "../server/validateAdminInviteToken"

const ValidateAdminInviteToken = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.string().email().optional(),
})

export default resolver.pipe(resolver.zod(ValidateAdminInviteToken), async (input) =>
  validateAdminInviteToken(input)
)
