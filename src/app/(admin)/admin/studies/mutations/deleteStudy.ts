"use server"

import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { isSetupComplete } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"
import type { StudyWithMinimalRelations } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"

const DeleteStudySchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
})

export default resolver.pipe(
  resolver.zod(DeleteStudySchema),
  resolver.authorize("ADMIN"),
  async ({ studyIds }) => {
    await getAuthorizedSession()

    const studies = await db.study.findMany({
      where: { id: { in: studyIds } },
      include: {
        FeedbackTemplate: true,
        jatosStudyUploads: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    const studiesWithLatestUpload = studies.map((s) => ({
      ...s,
      latestJatosStudyUpload: s.jatosStudyUploads[0] ?? null,
    }))

    const deletable = studiesWithLatestUpload.filter(
      (s) => !isSetupComplete(s as StudyWithMinimalRelations) || s.archived
    )
    const notDeletable = studiesWithLatestUpload.filter(
      (s) => isSetupComplete(s as StudyWithMinimalRelations) && !s.archived
    )

    if (notDeletable.length > 0) {
      const titles = notDeletable.map((s) => s.title?.trim() || `Study #${s.id}`).join(", ")
      throw new Error(
        `Cannot delete: only studies with incomplete setup or archived studies can be deleted. The following have complete setup and are not archived: ${titles}`
      )
    }

    const idsToDelete = deletable.map((s) => s.id)
    const result = await db.study.deleteMany({
      where: { id: { in: idsToDelete } },
    })

    return { updated: result.count }
  }
)
