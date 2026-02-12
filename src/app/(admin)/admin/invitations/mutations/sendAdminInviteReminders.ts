"use server"

import { resolver } from "@blitzjs/rpc"
import { randomBytes, createHash } from "crypto"
import { z } from "zod"
import db from "db"
import { reminderAdminInvitationMailer } from "@/mailers/reminderAdminInvitationMailer"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

const SendAdminInviteReminders = z.object({
  inviteIds: z.array(z.number()).min(1, "Select at least one invite"),
})

export default resolver.pipe(
  resolver.zod(SendAdminInviteReminders),
  resolver.authorize("ADMIN"),
  async ({ inviteIds }) => {
    const now = new Date()

    // Fetch all requested invites to check their status
    const allInvites = await db.adminInvite.findMany({
      where: {
        id: { in: inviteIds },
      },
      select: {
        id: true,
        email: true,
        redeemedAt: true,
        revokedAt: true,
        expiresAt: true,
      },
    })

    // Filter valid invites (not redeemed, not revoked, not expired)
    const validInvites = allInvites.filter(
      (invite: (typeof allInvites)[number]) =>
        invite.redeemedAt === null && invite.revokedAt === null && invite.expiresAt > now
    )

    const sentEmails: string[] = []
    const failedEmails: string[] = []
    const skippedEmails: { email: string; reason: string }[] = []

    // Track skipped invites
    for (const invite of allInvites) {
      if (invite.redeemedAt !== null) {
        skippedEmails.push({ email: invite.email, reason: "already redeemed" })
      } else if (invite.revokedAt !== null) {
        skippedEmails.push({ email: invite.email, reason: "already revoked" })
      } else if (invite.expiresAt <= now) {
        skippedEmails.push({ email: invite.email, reason: "expired" })
      }
    }

    // Send reminder for each valid invite and update reminderSentAt
    for (const invite of validInvites) {
      try {
        // Regenerate token for security (old invite links become invalid)
        const plainToken = randomBytes(32).toString("base64url")
        const hashedToken = hashToken(plainToken)

        // Update invite with new token and reminderSentAt
        await db.adminInvite.update({
          where: { id: invite.id },
          data: {
            token: hashedToken,
            reminderSentAt: now,
          },
        })

        // Send reminder email
        await reminderAdminInvitationMailer({
          to: invite.email,
          token: plainToken,
          expiresAt: invite.expiresAt,
        }).send()

        sentEmails.push(invite.email)
      } catch (error) {
        failedEmails.push(invite.email)
      }
    }

    return {
      sent: sentEmails.length,
      failed: failedEmails.length,
      skipped: skippedEmails.length,
      sentEmails,
      failedEmails,
      skippedEmails,
    }
  }
)
