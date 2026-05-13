"use server"

import { AuthorizationError } from "blitz"
import db from "db"
import { getAuthorizedSession } from "@/src/lib/auth/session"
import { isSuperAdmin } from "@/src/lib/auth/roles"
import { inviteSelect } from "../inviteSelect"

export async function getAdminInvitesRsc() {
  const session = await getAuthorizedSession()
  if (!isSuperAdmin(session.role)) {
    throw new AuthorizationError()
  }

  return db.adminInvite.findMany({
    select: inviteSelect,
    orderBy: { createdAt: "desc" },
  })
}
