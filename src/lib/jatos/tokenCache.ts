import { createJatosUserToken } from "./api/admin/createJatosUserToken"

interface CachedToken {
  token: string
  expiresAt: number
}

// In-memory cache for JATOS tokens
// Key: jatosUserId, Value: CachedToken
const tokenCache = new Map<number, CachedToken>()

// JATOS tokens expire after 1 hour (3600 seconds).
// We cache them for 55 minutes to ensure we don't use a token that's about to expire.
const CACHE_TTL_MS = 55 * 60 * 1000

/**
 * Gets a valid JATOS API token for a specific JATOS user.
 * Generates a new one if it doesn't exist in the cache or is about to expire.
 */
export async function getOrGenerateJatosToken(
  jatosUserId: number,
  userId: string
): Promise<string> {
  const now = Date.now()
  const cached = tokenCache.get(jatosUserId)

  if (cached && cached.expiresAt > now) {
    return cached.token
  }

  // Generate a new token
  const { token } = await createJatosUserToken({
    jatosUserId,
    userId,
  })

  // Store in cache
  tokenCache.set(jatosUserId, {
    token,
    expiresAt: now + CACHE_TTL_MS,
  })

  return token
}

/**
 * Clears the token cache (useful for testing)
 */
export function clearTokenCache() {
  tokenCache.clear()
}
