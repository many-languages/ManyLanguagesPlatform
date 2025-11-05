import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

export const saveJatosRunUrlSchema = z.object({
  participantStudyId: z.number(),
  jatosRunUrl: z.string(),
})

export async function saveJatosRunUrl(participantStudyId: number, jatosRunUrl: string) {
  return await db.participantStudy.update({
    where: { id: participantStudyId },
    data: { jatosRunUrl },
  })
}

export default resolver.pipe(
  resolver.zod(saveJatosRunUrlSchema),
  resolver.authorize(),
  async ({ participantStudyId, jatosRunUrl }) => {
    return await saveJatosRunUrl(participantStudyId, jatosRunUrl)
  }
)
