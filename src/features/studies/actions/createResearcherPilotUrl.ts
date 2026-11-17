"use server"

import { getBlitzContext } from "@/src/app/blitz-server"
import { createPersonalStudyCodeForResearcher } from "@/src/lib/jatos/jatosAccessService"
import { normalizePilotLinkLabel } from "@/src/features/studies/domain/pilotLinkLabel"
import { createResearcherPilotLink } from "@/src/features/studies/server/studySetupWrites"

function generateMarkerToken(): string {
  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.getRandomValues) {
    throw new Error("Crypto API not available for marker token generation")
  }
  const bytes = new Uint8Array(16)
  cryptoObj.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function createResearcherPilotUrlAndSaveAction({
  studyId,
  studyResearcherId,
  jatosStudyUploadId,
  jatosStudyId,
  jatosBatchId,
  label,
}: {
  studyId: number
  studyResearcherId: number
  jatosStudyUploadId: number
  jatosStudyId: number
  jatosBatchId: number
  label?: string | null
}): Promise<string> {
  const { session } = await getBlitzContext()
  const userId = session.userId
  if (userId == null) {
    throw new Error("Not authenticated")
  }

  // Validate before creating the JATOS code so a bad label cannot leave an orphaned link behind.
  const normalizedLabel = normalizePilotLinkLabel(label)
  const markerToken = generateMarkerToken()

  return createPersonalStudyCodeForResearcher({
    studyId,
    userId,
    jatosStudyId,
    jatosStudyUploadId,
    jatosBatchId,
    type: "pm",
    comment: `pilot:${markerToken}`,
    onSave: (url) =>
      createResearcherPilotLink({
        studyId,
        studyResearcherId,
        jatosStudyUploadId,
        jatosRunUrl: url,
        markerToken,
        label: normalizedLabel,
      }).then(() => {}),
  })
}
