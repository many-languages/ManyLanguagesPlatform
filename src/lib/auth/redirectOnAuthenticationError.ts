import { redirect } from "next/navigation"

/**
 * `.catch()` handler for RSC data loaders that degrade to a fallback on failure.
 * An unauthenticated session is not a degradable failure: redirect to login instead of
 * rendering a partially empty page (layouts are not re-run on client-side navigation).
 */
export function fallbackOrLoginRedirect<T>(fallback: T) {
  return (error: unknown): T => {
    if (error instanceof Error && error.name === "AuthenticationError") {
      redirect("/login")
    }
    return fallback
  }
}
