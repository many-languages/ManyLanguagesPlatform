"use server"

import { createHash, randomBytes } from "crypto"
import db from "db"
import { adminInvitationMailer } from "mailers/adminInvitationMailer"
import type { CreateAdminInviteInput } from "../validations"
import { requireSuperAdminSession } from "./authorization"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

export async function createAdminInvite(input: CreateAdminInviteInput) {
  const session = await requireSuperAdminSession()
  const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)

  const plainToken = randomBytes(32).toString("base64url")
  const hashedToken = hashToken(plainToken)

  const invite = await db.adminInvite.create({
    data: {
      email: input.email,
      token: hashedToken,
      expiresAt,
      createdById: session.userId || undefined,
    },
  })

  await adminInvitationMailer({
    to: input.email,
    token: plainToken,
    expiresAt,
  }).send()

  return {
    id: invite.id,
    email: invite.email,
    expiresAt: invite.expiresAt,
    token: plainToken,
  }
}
