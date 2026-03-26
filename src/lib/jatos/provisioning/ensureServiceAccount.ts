import db from "db"
import { getAdminToken } from "../getAdminToken"
import { createJatosUser } from "../client/createJatosUser"
import { updateJatosUserRole } from "../client/updateJatosUserRole"

const SERVICE_ACCOUNT_KEY = "jatosServiceUserID"

/**
 * Ensures the JATOS service account exists.
 * Creates the user in JATOS and stores the ID in SystemConfig if not already present.
 * Idempotent: on subsequent calls, returns the existing ID without calling JATOS.
 *
 * Workaround: JATOS create-user endpoint ignores the role parameter, so we explicitly
 * PATCH the role to VIEWER after creation.
 */
export async function ensureServiceAccount(): Promise<number> {
  const existing = await db.systemConfig.findUnique({
    where: { key: SERVICE_ACCOUNT_KEY },
  })

  if (existing) {
    return parseInt(existing.value, 10)
  }

  const adminToken = getAdminToken()
  const { id } = await createJatosUser(
    {
      username: "mlp-service-account",
      name: "MLP Service Account",
      role: "VIEWER",
    },
    { token: adminToken }
  )

  // Workaround: JATOS create-user ignores role; set VIEWER explicitly via PATCH
  await updateJatosUserRole({ jatosUserId: id, role: "VIEWER" }, { token: adminToken })

  await db.systemConfig.create({
    data: { key: SERVICE_ACCOUNT_KEY, value: String(id) },
  })

  return id
}
