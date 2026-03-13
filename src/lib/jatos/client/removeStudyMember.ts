import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"

export interface RemoveStudyMemberParams {
  studyId: number | string
  userId: number
}

const OPERATION = "Remove study member"

/**
 * Removes a user from a JATOS study's members via the admin API.
 * studyId can be the numeric JATOS study ID or the study UUID.
 * Used when a researcher is removed from a study (StudyResearcher deleted).
 */
export async function removeStudyMember(
  { studyId, userId }: RemoveStudyMemberParams,
  auth: JatosAuth
): Promise<void> {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  let response: Response
  try {
    response = await fetch(`${JATOS_BASE}/jatos/api/v1/studies/${studyId}/members/${userId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
    })
  } catch (cause) {
    throw new JatosTransportError(`Network error during ${OPERATION}`, OPERATION, cause)
  }

  await throwIfJatosError(response, OPERATION, {
    jatosStudyId: typeof studyId === "number" ? studyId : undefined,
    userId,
  })
}
