/**
 * Pure URL builders for study and setup routes. No workflow or access policy —
 * those live in setupStatus.ts and server/layout code.
 */

export type StudySetupStepQuery = {
  edit?: boolean
  returnTo?: string
}

/** `/studies/:studyId` */
export function studyPath(studyId: number): string {
  return `/studies/${studyId}`
}

/**
 * `/studies/:studyId/setup/step:n` with optional query (e.g. edit mode from study hub).
 */
export function studySetupStepPath(
  studyId: number,
  step: number,
  query?: StudySetupStepQuery
): string {
  const base = `${studyPath(studyId)}/setup/step${step}`
  if (!query?.edit && (query?.returnTo === undefined || query.returnTo === "")) {
    return base
  }
  const params = new URLSearchParams()
  if (query?.edit) {
    params.set("edit", "true")
  }
  if (query?.returnTo !== undefined && query.returnTo !== "") {
    params.set("returnTo", query.returnTo)
  }
  const q = params.toString()
  return q ? `${base}?${q}` : base
}

/**
 * `/studies/:studyId/setup/:segment` — segment is the path after `/setup/`, e.g. `"step2"`.
 */
export function studySetupSegmentPath(studyId: number, segment: string): string {
  return `${studyPath(studyId)}/setup/${segment}`
}
