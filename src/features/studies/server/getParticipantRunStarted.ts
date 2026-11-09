import { getBlitzContext } from "@/src/app/blitz-server"
import { checkParticipantRunStartedForParticipant } from "@/src/lib/jatos/jatosAccessService"

/**
 * Whether the signed-in participant has started their personal JATOS link (from the study log).
 * Returns false when the log cannot be read, so the participant page keeps its previous behavior.
 */
export async function getParticipantRunStarted(input: {
  studyId: number
  pseudonym: string
  jatosStudyId: number
}): Promise<boolean> {
  const { session } = await getBlitzContext()
  if (session.userId == null) return false

  const result = await checkParticipantRunStartedForParticipant({
    ...input,
    userId: session.userId,
  })
  return result.success && result.started
}
