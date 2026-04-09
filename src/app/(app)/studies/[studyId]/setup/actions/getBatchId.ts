"use server"

import { getBlitzContext } from "@/src/app/blitz-server"
import { getBatchIdForResearcher } from "@/src/lib/jatos/jatosAccessService"

export async function getBatchIdAction(
  studyId: number,
  jatosStudyUUID: string
): Promise<number | null> {
  const { session } = await getBlitzContext()
  const userId = session.userId
  if (userId == null) {
    throw new Error("Not authenticated")
  }
  return getBatchIdForResearcher({
    studyId,
    userId,
    jatosStudyUUID,
  })
}
