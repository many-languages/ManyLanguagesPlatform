import db from "db"
import { getAdminToken } from "./getAdminToken"
import { createJatosUserToken } from "./client/createJatosUserToken"
import { provisionResearcherJatos } from "./provisioning/provisionResearcherJatos"

interface CachedToken {
  token: string
  expiresAt: number
}

const tokenCache = new Map<number, CachedToken>()
const inFlightPromises = new Map<number, Promise<string>>()
const CACHE_TTL_MS = 55 * 60 * 1000
const SERVICE_ACCOUNT_KEY = "jatosServiceUserID"

async function getOrGenerateJatosToken(jatosUserId: number, userId: string): Promise<string> {
  const now = Date.now()
  const cached = tokenCache.get(jatosUserId)

  if (cached && cached.expiresAt > now) {
    return cached.token
  }

  const existing = inFlightPromises.get(jatosUserId)
  if (existing) {
    return existing
  }

  const promise = (async () => {
    try {
      const { token } = await createJatosUserToken(
        { jatosUserId, userId },
        { token: getAdminToken() }
      )

      const now = Date.now()
      tokenCache.set(jatosUserId, {
        token,
        expiresAt: now + CACHE_TTL_MS,
      })

      return token
    } finally {
      inFlightPromises.delete(jatosUserId)
    }
  })()

  inFlightPromises.set(jatosUserId, promise)
  return promise
}

/**
 * Resolves the researcher's JIT token for JATOS API calls.
 * Used when the researcher is in session and performing operations on their own studies.
 */
export async function getTokenForResearcher(userId: number): Promise<string> {
  let researcherJatos = await db.researcherJatos.findUnique({
    where: { userId },
    select: { jatosUserId: true },
  })

  if (!researcherJatos) {
    const result = await provisionResearcherJatos(userId)
    researcherJatos = { jatosUserId: result.jatosUserId }
  }

  return getOrGenerateJatosToken(researcherJatos!.jatosUserId, String(userId))
}

/**
 * Returns a valid JATOS API token for the service account, scoped to the given study.
 * Validates that the service identity is attached to the study (JatosStudyUpload exists)
 * before returning the token. Fails loudly if the study was not imported through our flow.
 */
export async function getTokenForStudyService(jatosStudyId: number): Promise<string> {
  const upload = await db.jatosStudyUpload.findFirst({
    where: { jatosStudyId },
    select: { id: true },
  })

  if (!upload) {
    throw new Error(
      `[JATOS] Study ${jatosStudyId} is not in our system. Service account token cannot be used for studies not imported through our flow.`
    )
  }

  const config = await db.systemConfig.findUnique({
    where: { key: SERVICE_ACCOUNT_KEY },
  })

  if (!config) {
    throw new Error(
      "[JATOS] Service account not provisioned. Run ensureServiceAccount during setup."
    )
  }

  const jatosUserId = parseInt(config.value, 10)
  return getOrGenerateJatosToken(jatosUserId, "service-account")
}

/**
 * Returns the JATOS admin token. Provisioning only — never called by jatosAccessService.
 */
export { getAdminToken }

/**
 * Legacy: returns service account token without study validation.
 * Prefer getTokenForStudyService(studyId) when study context is available.
 */
export async function getServiceAccountToken(): Promise<string> {
  const config = await db.systemConfig.findUnique({
    where: { key: SERVICE_ACCOUNT_KEY },
  })

  if (!config) {
    throw new Error(
      "[JATOS] Service account not provisioned. Run ensureServiceAccount during setup."
    )
  }

  const jatosUserId = parseInt(config.value, 10)
  return getOrGenerateJatosToken(jatosUserId, "service-account")
}

/**
 * Clears the token cache and in-flight promises (useful for testing)
 */
export function clearTokenCache() {
  tokenCache.clear()
  inFlightPromises.clear()
}
