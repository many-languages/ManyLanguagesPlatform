import db from "db"
import { getTokenForResearcher } from "../tokenBroker"
import { grantAdminStudyAccessForDeletion } from "./grantAdminStudyAccess"
import { deleteJatosStudy } from "../client/deleteStudy"

export type DeleteStudyFromJatosMode = "admin" | "pi"

/**
 * Deletes the study from JATOS using a per-user API token from {@link getTokenForResearcher}
 * (never the env admin token as the acting identity on the delete request).
 *
 * - **admin:** verifies app ADMIN role, grants study membership via delegate researcher, then deletes.
 * - **pi:** caller must have verified PI; acting user is typically already a study member.
 *
 * No-op when there is no JATOS upload for the study (nothing to delete on JATOS).
 * Caller is responsible for DB deletion after this returns.
 */
export async function deletePlatformStudyFromJatos({
  studyId,
  actingUserId,
  mode,
}: {
  studyId: number
  actingUserId: number
  mode: DeleteStudyFromJatosMode
}): Promise<void> {
  if (mode === "admin") {
    const admin = await db.user.findUnique({
      where: { id: actingUserId },
      select: { role: true },
    })
    if (!admin || admin.role !== "ADMIN") {
      throw new Error(
        `User ${actingUserId} is not an app admin; cannot perform admin study deletion.`
      )
    }
  }

  const upload = await db.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { versionNumber: "desc" },
    select: { jatosStudyId: true },
  })

  if (!upload) {
    return
  }

  if (mode === "admin") {
    await grantAdminStudyAccessForDeletion({
      studyId,
      jatosStudyId: upload.jatosStudyId,
      adminUserId: actingUserId,
    })
  }

  const userToken = await getTokenForResearcher(actingUserId)
  await deleteJatosStudy(upload.jatosStudyId, { token: userToken })
}

/**
 * Admin-only: deletes the study on JATOS before DB removal. Requires a non-empty audit reason.
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

  await deletePlatformStudyFromJatos({ studyId, actingUserId: adminUserId, mode: "admin" })
}
