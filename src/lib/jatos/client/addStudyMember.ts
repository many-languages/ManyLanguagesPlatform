import type { JatosAuth } from "./types"

export interface AddStudyMemberParams {
  studyId: number | string
  userId: number
}

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

  const res = await fetch(`${JATOS_BASE}/jatos/api/v1/studies/${studyId}/members/${userId}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
  })

  const text = await res.text()

  if (!res.ok) {
    let errMsg: string
    try {
      const json = JSON.parse(text) as { error?: string }
      errMsg = json?.error ?? (text || res.statusText)
    } catch {
      errMsg = text || res.statusText
    }
    throw new Error(`Failed to add study member (${res.status}): ${errMsg}`)
  }
}
