import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"

export interface AddStudyMemberParams {
  studyId: number | string
  userId: number
}

const OPERATION = "Add study member"

/**
 * Adds a user as a member of a JATOS study via the admin API.
 * studyId can be the numeric JATOS study ID or the study UUID.
 */
export async function addStudyMember(
  { studyId, userId }: AddStudyMemberParams,
  auth: JatosAuth
): Promise<void> {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  let response: Response
  try {
    response = await fetch(`${JATOS_BASE}/jatos/api/v1/studies/${studyId}/members/${userId}`, {
      method: "PUT",
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
