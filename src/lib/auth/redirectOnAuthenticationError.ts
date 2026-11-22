import { redirect } from "next/navigation"
import { getLoginUrl } from "./getLoginUrl"

/**
 * `.catch()` handler for RSC data loaders that degrade to a fallback on failure.
 * An unauthenticated session is not a degradable failure: redirect to login (carrying the
 * requested URL, so login returns here) instead of rendering a partially empty page
 * (layouts are not re-run on client-side navigation).
 */
export function fallbackOrLoginRedirect<T>(fallback: T) {
  return async (error: unknown): Promise<T> => {
    if (error instanceof Error && error.name === "AuthenticationError") {
      redirect(await getLoginUrl())
    }
    return fallback
  }
}
