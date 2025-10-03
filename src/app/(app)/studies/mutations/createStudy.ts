import { resolver } from "@blitzjs/rpc"
import db from "db"
import { CreateStudy, CreateStudyInput } from "../validations"

export async function createStudy(data: CreateStudyInput, userId: number) {
  return db.study.create({
    data: {
      ...data,
      researchers: {
        create: {
          userId,
          role: "PI", // researcher creating the study becomes PI
        },
      },
    },
    include: { researchers: true },
  })
}

const DUP_MSG =
  "A study with this uuid has been already uploaded to our servers. Please change the uuid in the .jas file in your .jzip folder and try again."

export default resolver.pipe(
  resolver.zod(CreateStudy),
  resolver.authorize(),
  async (input, ctx) => {
    if (!ctx.session.userId) throw new Error("You must be logged in to create a study")

    // Check for duplicate uuid in the db
    if (input.jatosStudyUUID) {
      const exists = await db.study.findUnique({ where: { jatosStudyUUID: input.jatosStudyUUID } })
      if (exists) throw new Error(DUP_MSG)
    }

    try {
      return await createStudy(input, ctx.session.userId)
    } catch (e: any) {
      // unique constraint fallback (race condition)
      if (e?.code === "P2002" && e?.meta?.target?.includes?.("jatosStudyUUID")) {
        throw new Error(DUP_MSG)
      }
      throw e
    }
  }
)
