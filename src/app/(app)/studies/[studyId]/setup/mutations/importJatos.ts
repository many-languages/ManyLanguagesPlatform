import { resolver } from "@blitzjs/rpc"
import db from "db"
import { ImportJatosSchema } from "../../../validations"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

export default resolver.pipe(
  resolver.zod(ImportJatosSchema),
  resolver.authorize("RESEARCHER"),
  async (input, ctx) => {
    const { studyId, jatosWorkerType, jatosStudyId, jatosStudyUUID, jatosFileName } = input

    // Authorization check
    await verifyResearcherStudyAccess(studyId)

    // Check if JATOS is being changed (not first upload)
    const existingStudy = await db.study.findUnique({
      where: { id: studyId },
      select: { jatosStudyUUID: true, step2Completed: true },
    })

    // JATOS is changing if:
    // 1. There was a UUID before and it's different now, OR
    // 2. Step 2 was previously completed (meaning JATOS existed before, even if cleared)
    const isChangingJatos =
      (existingStudy?.jatosStudyUUID && existingStudy.jatosStudyUUID !== jatosStudyUUID) ||
      (existingStudy?.step2Completed && jatosStudyUUID)

    try {
      const result = await db.study.update({
        where: { id: studyId },
        data: {
          jatosWorkerType,
          jatosStudyId,
          jatosStudyUUID,
          jatosFileName,
        },
        select: {
          id: true,
          jatosWorkerType: true,
          jatosStudyId: true,
          jatosStudyUUID: true,
          jatosFileName: true,
        },
      })

      // If JATOS changed, invalidate Step 3 (clear test run URLs)
      // Step 4 (Codebook) and Step 5 (FeedbackTemplate) are preserved but will be marked incomplete
      if (isChangingJatos) {
        await db.studyResearcher.updateMany({
          where: { studyId },
          data: { jatosRunUrl: null },
        })
        // Invalidate step 3, step 4, and step 5 completion status
        await db.study.update({
          where: { id: studyId },
          data: {
            step3Completed: false,
            step4Completed: false,
            step5Completed: false,
          },
        })
      }

      return { study: result }
    } catch (e: any) {
      // Handle DB unique constraint (shouldn't happen with new flow)
      if (e?.code === "P2002" && e?.meta?.target?.includes?.("jatosStudyUUID")) {
        return {
          error: "UUID already exists in database",
          jatosStudyUUID,
        }
      }
      throw e
    }
  }
)
