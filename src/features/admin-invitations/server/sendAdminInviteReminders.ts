"use server"

import { createHash, randomBytes } from "crypto"
import db from "db"
import { reminderAdminInvitationMailer } from "@/mailers/reminderAdminInvitationMailer"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

export async function sendAdminInviteReminders(inviteIds: number[]) {
  const now = new Date()

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

  const validInvites = allInvites.filter(
    (invite) => invite.redeemedAt === null && invite.revokedAt === null && invite.expiresAt > now
  )

  const sentEmails: string[] = []
  const failedEmails: string[] = []
  const skippedEmails: { email: string; reason: string }[] = []

  for (const invite of allInvites) {
    if (invite.redeemedAt !== null) {
      skippedEmails.push({ email: invite.email, reason: "already redeemed" })
    } else if (invite.revokedAt !== null) {
      skippedEmails.push({ email: invite.email, reason: "already revoked" })
    } else if (invite.expiresAt <= now) {
      skippedEmails.push({ email: invite.email, reason: "expired" })
    }
  }

  for (const invite of validInvites) {
    try {
      const plainToken = randomBytes(32).toString("base64url")
      const hashedToken = hashToken(plainToken)

      await db.adminInvite.update({
        where: { id: invite.id },
        data: {
          token: hashedToken,
          reminderSentAt: now,
        },
      })

      await reminderAdminInvitationMailer({
        to: invite.email,
        token: plainToken,
        expiresAt: invite.expiresAt,
      }).send()

      sentEmails.push(invite.email)
    } catch {
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
