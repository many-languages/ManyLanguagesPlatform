import type { Route } from "next"
import { headers } from "next/headers"
import { CURRENT_PATH_HEADER, loginUrlWithNext } from "./loginUrl"

/**
 * Where to send a signed-out visitor from a server component: the login page, carrying the URL
 * they asked for so `LoginForm` can return them there afterwards.
 *
 *   if (!session.userId) redirect(await getLoginUrl())
 *
 * `redirect()` is called by the caller (not here) so TypeScript still narrows `session.userId`.
 */
export async function getLoginUrl(): Promise<Route> {
  const requestedPath = (await headers()).get(CURRENT_PATH_HEADER)
  return loginUrlWithNext(requestedPath) as Route
}
