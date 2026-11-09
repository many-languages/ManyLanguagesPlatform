import type { JatosStudyLogEntry } from "../client/getStudyLog"

const STUDY_RUN_STARTED_PREFIX = "Started study run"

/**
 * Study code from a stored JATOS run URL (`<base>/publix/<code>`, optionally with a query string).
 * Returns null for anything that is not a run URL.
 */
export function extractStudyCodeFromRunUrl(runUrl: string | null | undefined): string | null {
  if (!runUrl) return null

  let pathname: string
  try {
    pathname = new URL(runUrl).pathname
  } catch {
    return null
  }

  const match = pathname.match(/\/publix\/([^/]+)\/?$/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Study codes with at least one "Started study run …" entry in the study log.
 * JATOS writes this entry when a run begins, including runs that fail before any component starts.
 */
export function getStartedRunStudyCodes(entries: JatosStudyLogEntry[]): Set<string> {
  const codes = new Set<string>()
  for (const entry of entries) {
    if (entry.msg.startsWith(STUDY_RUN_STARTED_PREFIX) && entry.studyCode) {
      codes.add(entry.studyCode)
    }
  }
  return codes
}

/** True when the participant's personal link shows up as started in the study log. */
export function hasStartedRun(
  runUrl: string | null | undefined,
  startedCodes: ReadonlySet<string>
): boolean {
  const code = extractStudyCodeFromRunUrl(runUrl)
  return code !== null && startedCodes.has(code)
}
