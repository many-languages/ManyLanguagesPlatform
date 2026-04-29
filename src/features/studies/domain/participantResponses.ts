import db from "db"
import { getResultsMetadata } from "@/src/lib/jatos/client/getResultsMetadata"
import { JatosTransportError } from "@/src/lib/jatos/errors"
import { getTokenForStudyService } from "@/src/lib/jatos/tokenBroker"
import { hasParticipantResponses } from "@/src/lib/jatos/utils/studyHasParticipantResponses"

/**
 * Whether the study has any non-pilot FINISHED JATOS results.
 * Short-circuits to false when there is no JATOS upload / UUID (cannot have responses yet).
 * Uses the study service account token for metadata (same family as participant dashboard reads).
 *
 * @throws Error with a user-facing message if JATOS metadata cannot be fetched (fail closed).
 */
export async function studyHasParticipantResponses(studyId: number): Promise<boolean> {
  const upload = await db.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { versionNumber: "desc" },
    select: { jatosStudyId: true },
  })
  const study = await db.study.findUnique({
    where: { id: studyId },
    select: { jatosStudyUUID: true },
  })
  if (!upload || !study?.jatosStudyUUID?.trim()) {
    return false
  }

  try {
    const token = await getTokenForStudyService(upload.jatosStudyId)
    const metadata = await getResultsMetadata({ studyIds: [upload.jatosStudyId] }, { token })
    const jatosUuid = study.jatosStudyUUID.trim()
    const entry =
      metadata.data?.find((d) => d.studyUuid === jatosUuid) ?? metadata.data?.[0] ?? null
    return hasParticipantResponses(entry?.studyResults ?? [])
  } catch (e: unknown) {
    const detail =
      e instanceof JatosTransportError
        ? e.message
        : e instanceof Error
        ? e.message
        : "Unknown error"
    throw new Error(`Could not verify participant responses. JATOS may be unavailable: ${detail}`)
  }
}

/**
 * Same as {@link studyHasParticipantResponses} but returns `null` if JATOS/metadata cannot be read
 * (e.g. admin list UI without failing the whole page).
 */
export async function studyHasParticipantResponsesSafe(studyId: number): Promise<boolean | null> {
  try {
    return await studyHasParticipantResponses(studyId)
  } catch {
    return null
  }
}
