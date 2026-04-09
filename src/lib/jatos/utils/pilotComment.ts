/**
 * Shared utilities for pilot comment format (comment starts with "pilot:").
 * Used by jatosAccessService and checkPilotCompletion.
 */

export const PILOT_COMMENT_PREFIX = "pilot:"

/**
 * Extracts the marker token from a pilot comment, e.g. "pilot:abc123" -> "abc123".
 * Returns null if comment is not a valid pilot comment.
 */
export function extractPilotMarkerToken(comment?: string): string | null {
  if (typeof comment !== "string" || !comment.startsWith(PILOT_COMMENT_PREFIX)) return null
  const token = comment.slice(PILOT_COMMENT_PREFIX.length)
  return token ? token : null
}

/**
 * Returns true if the comment is a pilot comment (starts with "pilot:").
 */
export function isPilotComment(comment?: string): boolean {
  return typeof comment === "string" && comment.startsWith(PILOT_COMMENT_PREFIX)
}
