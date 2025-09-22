import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateStudy } from "../validations"

export default resolver.pipe(
  resolver.zod(UpdateStudy),
  resolver.authorize(), // only logged-in users can update
  async (input) => {
    const { id, ...data } = input

    // Convert dates from string to Date
    const updatedStudy = await db.study.update({
      where: { id },
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    })

    return updatedStudy
  }
)
