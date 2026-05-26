"use server"

import { AuthorizationError } from "blitz"
import { UserRole } from "@/db"
import { getBlitzContext } from "@/src/app/blitz-server"
import { createPersonalStudyCodeForParticipant } from "@/src/lib/jatos/jatosAccessService"
import { saveParticipantRunUrl } from "@/src/features/studies/server/studyParticipationWrites"
import { CreateParticipantStudyCodeActionSchema } from "../validations"

export async function createParticipantStudyCodeAndSaveAction(input: unknown): Promise<string> {
  const { studyId, jatosStudyId, jatosBatchId, type, comment, participantStudyId } =
    CreateParticipantStudyCodeActionSchema.parse(input)

  const { session } = await getBlitzContext()
  const userId = session.userId
  if (userId == null) {
    throw new Error("Not authenticated")
  }
  if (session.role !== UserRole.PARTICIPANT) {
    throw new AuthorizationError("Only participants can run studies")
  }

  return createPersonalStudyCodeForParticipant({
    studyId,
    userId,
    jatosStudyId,
    jatosBatchId,
    type,
    comment,
    participantStudyId,
    onSave: async (runUrl) => {
      await saveParticipantRunUrl({ participantStudyId, studyId, jatosRunUrl: runUrl })
    },
  })
}
