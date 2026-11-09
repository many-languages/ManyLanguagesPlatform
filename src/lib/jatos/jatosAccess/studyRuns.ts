import db from "db"
import { getStudyLog } from "../client/getStudyLog"
import { isJatosMappedError, mapJatosErrorToUserMessage } from "../errors"
import { getStartedRunStudyCodes, hasStartedRun } from "../utils/studyRunStarts"
import {
  assertJatosStudyBelongsToStudy,
  withParticipantViewerToken,
  withResearcherToken,
} from "./core"

/**
 * Study codes with a recorded run start, read from the JATOS study log.
 * Needed because `results/metadata` omits runs that failed before any component result existed.
 */
export async function fetchStartedRunCodes({
  jatosStudyId,
  token,
}: {
  jatosStudyId: number
  token: string
}): Promise<Set<string>> {
  const { entries } = await getStudyLog({ studyId: jatosStudyId }, { token })
  return getStartedRunStudyCodes(entries)
}

/**
 * Whether any participant of the app study has started their personal link (log-based).
 * Participant links only: pilot runs use their own study codes and are not stored on participants.
 */
export async function anyParticipantRunStarted({
  studyId,
  jatosStudyId,
  token,
}: {
  studyId: number
  jatosStudyId: number
  token: string
}): Promise<boolean> {
  const participants = await db.participantStudy.findMany({
    where: { studyId, jatosRunUrl: { not: null } },
    select: { jatosRunUrl: true },
  })
  if (participants.length === 0) return false

  const startedCodes = await fetchStartedRunCodes({ jatosStudyId, token })
  return participants.some((participant) => hasStartedRun(participant.jatosRunUrl, startedCodes))
}

/** Study codes that have a recorded run start, for the researcher participant table. */
export async function getStartedRunCodesForResearcher({
  studyId,
  userId,
  jatosStudyId,
}: {
  studyId: number
  userId: number
  jatosStudyId: number
}): Promise<Set<string>> {
  return withResearcherToken({ studyId, userId }, async ({ token }) => {
    await assertJatosStudyBelongsToStudy({ studyId, jatosStudyId })
    return fetchStartedRunCodes({ jatosStudyId, token })
  })
}

/**
 * Whether the authenticated participant has started their personal link, according to the
 * JATOS study log. Combine with the completion check to detect started-but-unfinished runs.
 */
export async function checkParticipantRunStartedForParticipant({
  studyId,
  pseudonym,
  jatosStudyId,
  userId,
}: {
  studyId: number
  pseudonym: string
  jatosStudyId: number
  userId: number
}): Promise<{ success: boolean; started: boolean; error?: string }> {
  try {
    return await withParticipantViewerToken(
      { studyId, pseudonym, userId, jatosStudyId },
      async ({ jatosStudyId, token }) => {
        const participant = await db.participantStudy.findUnique({
          where: { userId_studyId: { userId, studyId } },
          select: { jatosRunUrl: true },
        })
        if (!participant?.jatosRunUrl) return { success: true, started: false }

        const startedCodes = await fetchStartedRunCodes({ jatosStudyId, token })
        return { success: true, started: hasStartedRun(participant.jatosRunUrl, startedCodes) }
      }
    )
  } catch (error) {
    if (!isJatosMappedError(error)) {
      console.error("[checkParticipantRunStartedForParticipant]", { studyId, jatosStudyId, error })
    }
    return { success: false, started: false, error: mapJatosErrorToUserMessage(error) }
  }
}
