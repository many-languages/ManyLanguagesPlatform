import db from "db"
import { getTokenForResearcher } from "../tokenBroker"
import { grantAdminStudyAccessForDeletion } from "./grantAdminStudyAccess"
import { deleteJatosStudy } from "../client/deleteStudy"

/**
 * Deletes a study from JATOS and prepares for DB deletion.
 * Uses the admin's own JATOS token (no admin token, no researcher token for delete).
 *
 * Flow:
 * 1. Verify admin has ADMIN role
 * 2. Ensure admin has JATOS study membership (via researcher delegation)
 * 3. Delete study from JATOS using admin's token
 *
 * Caller is responsible for DB deletion after this returns.
 *
 * @param studyId - App study ID
 * @param adminUserId - App user ID of the admin performing the delete
 * @param reason - Required reason for traceability (e.g. logs)
 * @throws if admin is not an app ADMIN, or if no eligible researcher exists
 */
export async function deleteStudyAsAdmin({
  studyId,
  adminUserId,
  reason,
}: {
  studyId: number
  adminUserId: number
  reason: string
}): Promise<void> {
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    throw new Error("[JATOS] Admin study deletion requires a non-empty reason.")
  }

  const admin = await db.user.findUnique({
    where: { id: adminUserId },
    select: { role: true },
  })
  if (!admin || admin.role !== "ADMIN") {
    throw new Error(
      `[JATOS] User ${adminUserId} is not an app admin; cannot perform admin study deletion.`
    )
  }

  const upload = await db.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { versionNumber: "desc" },
    select: { jatosStudyId: true },
  })

  if (!upload) {
    return
  }

  const jatosStudyId = upload.jatosStudyId

  await grantAdminStudyAccessForDeletion({
    studyId,
    jatosStudyId,
    adminUserId,
  })

  const adminToken = await getTokenForResearcher(adminUserId)
  await deleteJatosStudy(jatosStudyId, { token: adminToken })
}
