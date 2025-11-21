"use server"

import { resolver } from "@blitzjs/rpc"
import { randomBytes, createHash } from "crypto"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { createAdminInviteInputSchema } from "../validations"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

export default resolver.pipe(
  resolver.zod(createAdminInviteInputSchema),
  resolver.authorize("ADMIN"),
  async ({ email, expiresInHours }) => {
    const session = await getAuthorizedSession()
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

    const plainToken = randomBytes(32).toString("base64url")
    const hashedToken = hashToken(plainToken)

    const invite = await db.adminInvite.create({
      data: {
        email,
        token: hashedToken,
        expiresAt,
        createdById: session.userId || undefined,
      },
    })

    return {
      id: invite.id,
      email: invite.email,
      expiresAt: invite.expiresAt,
      token: plainToken,
    }
  }
)
