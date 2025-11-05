import { resolver } from "@blitzjs/rpc"
import db from "db"
import { ImportJatosSchema } from "../../../validations"

const DUP_MSG =
  "A study with this uuid has been already uploaded to our servers. Please change the uuid in the .jas file in your .jzip folder and try again."

export default resolver.pipe(
  resolver.zod(ImportJatosSchema),
  resolver.authorize("RESEARCHER"),
  async (input, ctx) => {
    const { studyId, jatosWorkerType, jatosStudyId, jatosStudyUUID, jatosFileName } = input

    // Authorization check
    const researcher = await db.studyResearcher.findFirst({
      where: { studyId, userId: ctx.session.userId! },
    })

    if (!researcher) {
      throw new Error("You are not authorized to modify this study.")
    }

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
      // Step 4 FeedbackTemplate is preserved but will be marked incomplete
      if (isChangingJatos) {
        await db.studyResearcher.updateMany({
          where: { studyId },
          data: { jatosRunUrl: null },
        })
        // Invalidate step 3 and step 4 completion status
        await db.study.update({
          where: { id: studyId },
          data: {
            step3Completed: false,
            step4Completed: false,
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
