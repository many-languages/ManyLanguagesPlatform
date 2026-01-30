import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { getBlitzContext } from "@/src/app/blitz-server"
import { AuthenticationError } from "blitz"

export const saveParticipantRunUrlSchema = z.object({
  participantStudyId: z.number(),
  jatosRunUrl: z.string(),
})

export async function saveParticipantRunUrl(participantStudyId: number, jatosRunUrl: string) {
  const { session } = await getBlitzContext()
  const participant = await db.participantStudy.findUnique({
    where: { id: participantStudyId },
    select: { userId: true },
  })

  if (!participant || participant.userId !== session.userId) {
    throw new AuthenticationError("Unauthorized access to participant record")
  }

  return await db.participantStudy.update({
    where: { id: participantStudyId },
    data: { jatosRunUrl },
  })
}

export default resolver.pipe(
  resolver.zod(saveParticipantRunUrlSchema),
  resolver.authorize(),
  async ({ participantStudyId, jatosRunUrl }) => {
    return await saveParticipantRunUrl(participantStudyId, jatosRunUrl)
  }
)
