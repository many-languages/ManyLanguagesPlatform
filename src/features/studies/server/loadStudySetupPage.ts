import { notFound } from "next/navigation"
import { getResearcherStudyRsc } from "./getStudy"
import type { StudyWithRelations } from "../types"

export type StudySetupPageContext = {
  studyId: number
  study: StudyWithRelations
}

/**
 * Resolves route `params` to a numeric study id and loaded study for setup step pages.
 * Aligns with `setup/layout.tsx`: invalid id → `notFound()`, missing study → `notFound()`.
 */
export async function loadStudySetupPage(
  params: Promise<{ studyId: string }>
): Promise<StudySetupPageContext> {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    const study = await getResearcherStudyRsc(studyId)
    return { studyId, study }
  } catch (error: unknown) {
    if ((error as { name?: string })?.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
