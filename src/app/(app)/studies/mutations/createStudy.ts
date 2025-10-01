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

export default resolver.pipe(
  resolver.zod(CreateStudy),
  resolver.authorize("RESEARCHER"), // global role check
  async (input, ctx) => {
    if (!ctx.session.userId) throw new Error("You must be logged in to create a study")
    return createStudy(input, ctx.session.userId)
  }
)
