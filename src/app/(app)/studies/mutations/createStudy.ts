import { resolver } from "@blitzjs/rpc"
import db from "db"
import { CreateStudy } from "../validations"

export default resolver.pipe(
  resolver.zod(CreateStudy),
  resolver.authorize("RESEARCHER"), // only researchers can create studies
  async (input, ctx) => {
    const userId = ctx.session.userId

    if (!userId) {
      throw new Error("You must be logged in to create a study")
    }

    const study = await db.study.create({
      data: {
        title: input.title,
        description: input.description,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        sampleSize: input.sampleSize,
        payment: input.payment,
        ethicalPermission: input.ethicalPermission,
        length: input.length,
        researchers: {
          create: {
            userId,
            role: "PI", // researcher creating the study becomes PI
          },
        },
      },
      include: { researchers: true },
    })

    return study
  }
)
