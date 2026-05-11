"use server"

import { getBlitzContext } from "@/src/app/blitz-server"
import { createPersonalStudyCodeForParticipant } from "@/src/lib/jatos/jatosAccessService"
import { saveParticipantRunUrl } from "@/src/features/studies/server/studyParticipationWrites"

export async function createParticipantStudyCodeAndSaveAction({
  studyId,
  jatosStudyId,
  jatosBatchId,
  type,
  comment,
  participantStudyId,
}: {
  studyId: number
  jatosStudyId: number
  jatosBatchId?: number
  type: "ps" | "pm"
  comment: string
  participantStudyId: number
}): Promise<string> {
  const { session } = await getBlitzContext()
  const userId = session.userId
  if (userId == null) {
    throw new Error("Not authenticated")
  }

  return createPersonalStudyCodeForParticipant({
    studyId,
    userId,
    jatosStudyId,
    jatosBatchId,
    type,
    comment,
    onSave: async (runUrl) => {
      await saveParticipantRunUrl({ participantStudyId, jatosRunUrl: runUrl })
    },
  })
}
