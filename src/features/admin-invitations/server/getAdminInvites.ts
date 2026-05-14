"use server"

import db from "db"
import { inviteSelect } from "../inviteSelect"
import { requireSuperAdminSession } from "./authorization"

export async function getAdminInvitesRsc() {
  await requireSuperAdminSession()

  return db.adminInvite.findMany({
    select: inviteSelect,
    orderBy: { createdAt: "desc" },
  })
}
