import db from "db"
import { getAuthorizedSession } from "@/src/lib/auth/session"
import {
  createPersonalStudyCodeForResearcher,
  getResultsMetadataForResearcher,
  getStartedRunCodesForResearcher,
} from "@/src/lib/jatos/jatosAccessService"
import { isJatosMappedError, mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"
import { hasStartedRun } from "@/src/lib/jatos/utils/studyRunStarts"
import { isParticipantRetryable, pickParticipantStudyResult } from "../domain/participantRetry"
import { assertStudyNotArchived } from "./studyLifecycle"
import { resolveSingleStudyIdForParticipants } from "./studyParticipationWrites"
import { verifyResearcherStudyAccess } from "./verifyResearcherStudyAccess"

/**
 * Gives participants a fresh single-run JATOS link after their run was started but never
 * finished. The pseudonym stays the same, so their earlier (unfinished) run remains in JATOS
 * under the same comment and is skipped by extraction. Replacing `jatosRunUrl` is what resets
 * the "started" state: it is derived from the study code in that URL.
 *
 * Every selected participant is validated before any link is created.
 */
export async function allowParticipantRetry(input: { participantIds: number[] }) {
  const session = await getAuthorizedSession()
  const userId = session.userId
  if (!userId) {
    throw new Error("Not authenticated")
  }

  const studyId = await resolveSingleStudyIdForParticipants(input.participantIds)
  await verifyResearcherStudyAccess(studyId, userId)
  await assertStudyNotArchived(studyId)

  const upload = await db.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { createdAt: "desc" },
    select: { jatosStudyId: true, jatosBatchId: true, jatosWorkerType: true },
  })
  if (!upload || upload.jatosBatchId == null) {
    throw new Error("This study has no JATOS batch to create a link in.")
  }
  const { jatosStudyId, jatosBatchId, jatosWorkerType } = upload

  const participants = await db.participantStudy.findMany({
    where: { id: { in: input.participantIds } },
    select: { id: true, pseudonym: true, jatosRunUrl: true, user: { select: { email: true } } },
  })

  let metadata
  let startedCodes
  try {
    ;[metadata, startedCodes] = await Promise.all([
      getResultsMetadataForResearcher({ studyId, userId, studyIds: [jatosStudyId] }),
      getStartedRunCodesForResearcher({ studyId, userId, jatosStudyId }),
    ])
  } catch (error) {
    throw new Error(isJatosMappedError(error) ? mapJatosErrorToUserMessage(error) : String(error))
  }
  const studyResults = metadata.data?.find((s) => s.studyId === jatosStudyId)?.studyResults ?? []

  // Validate everyone first so a bad selection creates no links at all
  for (const participant of participants) {
    const result = pickParticipantStudyResult(studyResults, {
      pseudonym: participant.pseudonym,
      email: participant.user.email,
    })
    const retryable = isParticipantRetryable({
      workerType: jatosWorkerType,
      started: hasStartedRun(participant.jatosRunUrl, startedCodes),
      finished: result?.studyState === "FINISHED",
    })
    if (!retryable) {
      throw new Error(
        `${participant.user.email} cannot be given a retry: only participants in a single-run study who started but did not finish qualify.`
      )
    }
  }

  let granted = 0
  for (const participant of participants) {
    try {
      await createPersonalStudyCodeForResearcher({
        studyId,
        userId,
        jatosStudyId,
        jatosBatchId,
        type: "ps",
        comment: participant.pseudonym,
        onSave: async (runUrl) => {
          await db.participantStudy.update({
            where: { id: participant.id },
            data: { jatosRunUrl: runUrl },
          })
        },
      })
      granted += 1
    } catch (error) {
      const reason = isJatosMappedError(error)
        ? mapJatosErrorToUserMessage(error)
        : error instanceof Error
        ? error.message
        : "Unexpected error"
      throw new Error(
        `Retry granted to ${granted} of ${participants.length} participants. Failed for ${participant.user.email}: ${reason}`
      )
    }
  }

  return { granted }
}
