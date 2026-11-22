"use server"

import { createHash, randomBytes } from "crypto"
import db from "db"
import { adminInvitationMailer } from "mailers/adminInvitationMailer"
import type { CreateAdminInviteInput } from "../validations"
import { requireSuperAdminSession } from "./authorization"
import { getAdminInviteEmailStatus } from "./getAdminInviteEmailStatus"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

export type CreateAdminInviteResult =
  | {
      ok: true
      id: number
      email: string
      expiresAt: Date
      token: string
      /** True when the invitee already has a researcher account and accepts by logging in. */
      existingAccount: boolean
    }
  | { ok: false; error: string }

export async function createAdminInvite(
  input: CreateAdminInviteInput
): Promise<CreateAdminInviteResult> {
  const session = await requireSuperAdminSession()

  // User emails are stored lowercased and trimmed, so invites are matched the same way.
  const email = input.email.trim().toLowerCase()

  // Authoritative check: an invite that could never be accepted must not be created or emailed.
  const emailStatus = await getAdminInviteEmailStatus(email)
  if (!emailStatus.eligible) {
    return { ok: false, error: emailStatus.message }
  }
  const existingAccount = emailStatus.kind === "existing-researcher"

  const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)

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

  await adminInvitationMailer({
    to: email,
    token: plainToken,
    expiresAt,
    existingAccount,
  }).send()

  return {
    ok: true,
    id: invite.id,
    email: invite.email,
    expiresAt: invite.expiresAt,
    token: plainToken,
    existingAccount,
  }
}
