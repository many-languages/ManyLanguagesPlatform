"use server"

import { resolver } from "@blitzjs/rpc"
import db, { type UserRole } from "db"
import { z } from "zod"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { deleteStudyAsAdmin } from "@/src/lib/jatos/admin/deleteStudyWorkflow"
import { studyHasParticipantResponsesSafe } from "@/src/lib/studies"
import { isSuperAdmin } from "@/src/lib/auth/roles"

const DeleteStudySchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
  reason: z.string().min(1, "Reason is required"),
})

export default resolver.pipe(
  resolver.zod(DeleteStudySchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds, reason }) => {
    const session = await getAuthorizedSession()
    const adminUserId = session.userId
    if (!adminUserId) {
      throw new Error("Not authenticated")
    }

    const role = session.role as UserRole
    const superadmin = isSuperAdmin(role)

    const studies = await db.study.findMany({
      where: { id: { in: studyIds } },
      include: {
        FeedbackTemplate: true,
        researchers: { select: { userId: true } },
        jatosStudyUploads: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    })

    if (studies.length !== studyIds.length) {
      throw new Error("One or more studies were not found.")
    }

    for (const study of studies) {
      const hasResponsesSafe = await studyHasParticipantResponsesSafe(study.id)
      if (hasResponsesSafe === null) {
        throw new Error(
          "Could not verify participant response data for one or more studies. Please try again later."
        )
      }

      const title = study.title?.trim() || `Study #${study.id}`

      if (hasResponsesSafe && !study.archived) {
        throw new Error(
          `Cannot delete: studies with participant responses must be archived first. Affected: ${title}`
        )
      }

      if (hasResponsesSafe && study.archived && !superadmin) {
        throw new Error(
          `Cannot delete: archived studies with participant responses may only be removed by a superadmin. Affected: ${title}`
        )
      }
    }

    const idsToDelete = studies.map((s) => s.id)

    for (const study of studies) {
      await deleteStudyAsAdmin({
        studyId: study.id,
        adminUserId,
        reason,
      })
    }

    const result = await db.study.deleteMany({
      where: { id: { in: idsToDelete } },
    })

    return { updated: result.count }
  }
)
