import { redirect as nextRedirect } from "next/navigation"

/** Wraps next/navigation redirect to accept plain string paths alongside typed routes. */
export function redirect(path: string): never {
  return nextRedirect(path as never)
}
