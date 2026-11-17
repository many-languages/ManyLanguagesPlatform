import { extractPilotMarkerToken } from "@/src/lib/jatos/utils/pilotComment"

export const PILOT_LINK_LABEL_MAX_LENGTH = 60

/** Trims and validates an optional pilot link label. Returns null when empty. */
export function normalizePilotLinkLabel(label: string | null | undefined): string | null {
  const trimmed = (label ?? "").trim()
  if (trimmed === "") return null
  if (trimmed.length > PILOT_LINK_LABEL_MAX_LENGTH) {
    throw new Error(`Pilot link label must be at most ${PILOT_LINK_LABEL_MAX_LENGTH} characters`)
  }
  return trimmed
}

/** Looks up the label of the pilot link a JATOS result came from, via its comment's marker token. */
export function getPilotLinkLabel(
  comment: string | undefined,
  labelsByToken: Record<string, string> | undefined
): string | null {
  const token = extractPilotMarkerToken(comment)
  if (!token || !labelsByToken) return null
  return labelsByToken[token] ?? null
}
