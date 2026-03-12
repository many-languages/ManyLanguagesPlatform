import db from "db"
import { getOrGenerateJatosToken } from "./tokenCache"

const SERVICE_ACCOUNT_KEY = "jatosServiceUserID"

let cachedServiceUserId: number | null = null

/**
 * Returns the JATOS user ID of the service account.
 * Reads from SystemConfig and caches in memory (immutable after provisioning).
 * Returns null if the service account has not been provisioned yet.
 */
export async function getServiceAccountJatosUserId(): Promise<number | null> {
  if (cachedServiceUserId != null) return cachedServiceUserId

  const config = await db.systemConfig.findUnique({
    where: { key: SERVICE_ACCOUNT_KEY },
  })

  if (!config) return null

  cachedServiceUserId = parseInt(config.value, 10)
  return cachedServiceUserId
}

/**
 * Returns a valid JATOS API token for the service account.
 * Uses JIT generation via tokenCache (55-min cache, regenerated via admin token when expired).
 * Falls back to JATOS_TOKEN if the service account is not yet provisioned.
 */
export async function getServiceAccountToken(): Promise<string> {
  const jatosUserId = await getServiceAccountJatosUserId()

  if (jatosUserId == null) {
    console.warn("[JATOS] Service account not provisioned, falling back to JATOS_TOKEN")
    return process.env.JATOS_TOKEN!
  }

  return getOrGenerateJatosToken(jatosUserId, "service-account")
}
