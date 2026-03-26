import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"

export interface UpdateJatosUserRoleParams {
  jatosUserId: number
  role: "VIEWER" | "USER"
}

const OPERATION = "Update JATOS user role"

/**
 * Changes a JATOS user's role via the admin API.
 * Workaround: JATOS create-user endpoint ignores the role parameter, so we
 * explicitly set VIEWER after creating the service account.
 */
export async function updateJatosUserRole(
  { jatosUserId, role }: UpdateJatosUserRoleParams,
  auth: JatosAuth
): Promise<void> {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  let response: Response
  try {
    response = await fetch(`${JATOS_BASE}/jatos/api/v1/users/${jatosUserId}/roles`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ role }),
    })
  } catch (cause) {
    throw new JatosTransportError(`Network error during ${OPERATION}`, OPERATION, cause)
  }

  await throwIfJatosError(response, OPERATION, { userId: jatosUserId })
}
