"use server"

import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { deleteStudyAsAdmin } from "@/src/lib/jatos/admin/deleteStudyWorkflow"
import { studyHasParticipantResponses } from "@/src/lib/studies"

const DeleteStudySchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
  reason: z.string().min(1, "Reason is required"),
})

export default resolver.pipe(
  resolver.zod(DeleteStudySchema),
  resolver.authorize("ADMIN"),
  async ({ studyIds, reason }) => {
    const session = await getAuthorizedSession()
    const adminUserId = session.userId
    if (!adminUserId) {
      throw new Error("Not authenticated")
    }

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

    for (const study of studies) {
      const hasResponses = await studyHasParticipantResponses(study.id)
      if (hasResponses) {
        const title = study.title?.trim() || `Study #${study.id}`
        throw new Error(
          `Cannot delete: studies with participant responses must be archived, not deleted. Affected: ${title}`
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
