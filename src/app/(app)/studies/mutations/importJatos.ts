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

    // optional safety check — only researchers of the study can import
    const researcher = await db.studyResearcher.findFirst({
      where: { studyId, userId: ctx.session.userId! },
      select: { id: true },
    })

    if (!researcher) {
      throw new Error("You are not authorized to modify this study.")
    }

    // Check for duplicate uuid in the db
    if (jatosStudyUUID) {
      const exists = await db.study.findUnique({ where: { jatosStudyUUID: jatosStudyUUID } })
      if (exists) throw new Error(DUP_MSG)
    }

    try {
      return await db.study.update({
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
    } catch (e: any) {
      // unique constraint fallback (race condition)
      if (e?.code === "P2002" && e?.meta?.target?.includes?.("jatosStudyUUID")) {
        throw new Error(DUP_MSG)
      }
      throw e
    }
  }
)
