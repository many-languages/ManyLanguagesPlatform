import { resolver } from "@blitzjs/rpc"
import db from "db"
import { ensureResearcherJatosMember } from "@/src/lib/jatos/provisioning/ensureResearcherJatosMember"
import { CreateStudy, CreateStudyInput } from "../validations"

export async function createStudy(data: CreateStudyInput, userId: number) {
  const study = await db.study.create({
    data: {
      ...data,
      status: "CLOSED", // Study starts closed until setup is complete
      researchers: {
        create: {
          userId,
          role: "PI", // researcher creating the study becomes PI
        },
      },
    },
    include: { researchers: true },
  })

  // Sync JATOS membership if study already has an upload (e.g. re-import flow)
  const latestUpload = await db.jatosStudyUpload.findFirst({
    where: { studyId: study.id },
    orderBy: { versionNumber: "desc" },
    select: { jatosStudyId: true },
  })
  if (latestUpload) {
    await ensureResearcherJatosMember(userId, latestUpload.jatosStudyId)
  }

  return study
}

export default resolver.pipe(
  resolver.zod(CreateStudy),
  resolver.authorize(),
  async (input, ctx) => {
    if (!ctx.session.userId) throw new Error("You must be logged in to create a study")
    return await createStudy(input, ctx.session.userId)
  }
)
