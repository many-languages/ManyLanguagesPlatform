import { safeRedirectPath } from "./safeRedirectPath"

/**
 * Request header that `src/middleware.ts` sets on every page request to the path + query the
 * browser asked for. Server components cannot read the request URL themselves, so this is how a
 * layout or page that finds the visitor signed out knows where to send them back to after login.
 *
 * Kept free of `next/*` imports so the Edge middleware can import it.
 */
export const CURRENT_PATH_HEADER = "x-current-path"

/**
 * `/login?next=<requested path>` for a signed-out visitor, or plain `/login` when the requested
 * path is missing or not a safe same-origin path (see `safeRedirectPath`).
 */
export function loginUrlWithNext(requestedPath: string | null | undefined): string {
  const next = safeRedirectPath(requestedPath)
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login"
}
