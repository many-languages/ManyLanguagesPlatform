import db from "db"
import { getServiceAccountToken as getTokenFromBroker } from "./tokenBroker"

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
 * Delegates to tokenBroker. Prefer getTokenForStudyService(studyId) when study context is available.
 */
export async function getServiceAccountToken(): Promise<string> {
  return getTokenFromBroker()
}
