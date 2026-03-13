"use server"

import { getBlitzContext } from "@/src/app/blitz-server"
import { createPersonalStudyCodeForResearcher } from "@/src/lib/jatos/jatosAccessService"
import { createResearcherPilotLink } from "../mutations/createResearcherPilotLink"

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
}: {
  studyId: number
  studyResearcherId: number
  jatosStudyUploadId: number
  jatosStudyId: number
  jatosBatchId: number
}): Promise<string> {
  const { session } = await getBlitzContext()
  const userId = session.userId
  if (userId == null) {
    throw new Error("Not authenticated")
  }

  const markerToken = generateMarkerToken()

  return createPersonalStudyCodeForResearcher({
    studyId,
    userId,
    jatosStudyId,
    jatosBatchId,
    type: "pm",
    comment: `pilot:${markerToken}`,
    onSave: (url) =>
      createResearcherPilotLink(
        studyId,
        studyResearcherId,
        jatosStudyUploadId,
        url,
        markerToken,
        userId
      ).then(() => {}),
  })
}
