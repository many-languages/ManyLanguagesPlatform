"use server"

import db from "db"

export async function revokeAdminInvites(inviteIds: number[]) {
  const now = new Date()

  const result = await db.adminInvite.updateMany({
    where: { id: { in: inviteIds }, revokedAt: null },
    data: {
      revokedAt: now,
    },
  })

  return { revoked: result.count }
}
