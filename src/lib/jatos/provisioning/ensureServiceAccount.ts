import db from "db"
import { createJatosUser } from "../api/admin/createJatosUser"

const SERVICE_ACCOUNT_KEY = "jatosServiceUserID"

/**
 * Ensures the JATOS service account exists.
 * Creates the user in JATOS and stores the ID in SystemConfig if not already present.
 * Idempotent: on subsequent calls, returns the existing ID without calling JATOS.
 */
export async function ensureServiceAccount(): Promise<number> {
  const existing = await db.systemConfig.findUnique({
    where: { key: SERVICE_ACCOUNT_KEY },
  })

  if (existing) {
    return parseInt(existing.value, 10)
  }

  const { id } = await createJatosUser({
    username: "mlp-service-account",
    name: "MLP Service Account",
  })

  await db.systemConfig.create({
    data: { key: SERVICE_ACCOUNT_KEY, value: String(id) },
  })

  return id
}
