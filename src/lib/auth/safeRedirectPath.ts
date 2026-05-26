/** Same-origin relative path only; blocks open redirects via `?next=`. */
export function safeRedirectPath(next: string | null | undefined): string | null {
  if (!next) return null
  if (!next.startsWith("/") || next.startsWith("//")) return null
  if (next.includes(":")) return null
  return next
}
