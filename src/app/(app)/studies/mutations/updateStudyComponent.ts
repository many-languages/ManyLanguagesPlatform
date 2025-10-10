import db from "db"
import { resolver } from "@blitzjs/rpc"
import { UpdateStudyComponent } from "../validations"

export default resolver.pipe(
  resolver.zod(UpdateStudyComponent),
  resolver.authorize(),
  async ({ id, jatosComponentId, jatosComponentUUID }) => {
    const study = await db.study.update({
      where: { id },
      data: {
        jatosComponentId,
        jatosComponentUUID,
      },
    })
    return study
  }
)
