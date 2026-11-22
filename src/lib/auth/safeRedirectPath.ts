/** Same-origin relative path only; blocks open redirects via `?next=`. */
export function safeRedirectPath(next: string | null | undefined): string | null {
  if (!next) return null
  if (!next.startsWith("/") || next.startsWith("//")) return null
  if (next.includes(":")) return null
  // Browsers treat `\` as `/`, so `/\evil.com` would behave like the protocol-relative `//evil.com`.
  // Control characters (tab/newline) are stripped by URL parsers and can hide a second slash.
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return null
  return next
}
