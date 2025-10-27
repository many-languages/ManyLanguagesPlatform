import { resolver } from "@blitzjs/rpc"
import db from "db"
import { ImportJatosSchema } from "../validations"

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
