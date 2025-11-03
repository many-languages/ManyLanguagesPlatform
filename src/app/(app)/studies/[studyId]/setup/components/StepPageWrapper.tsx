"use client"

import { useStudySetup } from "./StudySetupProvider"
import { StudyWithRelations } from "../../../queries/getStudy"

interface StepPageWrapperProps {
  children: (study: StudyWithRelations, studyId: number) => React.ReactNode
}

/**
 * Wrapper component that provides study data to step page content
 * Uses context from StudySetupProvider to avoid redundant fetching
 */
export default function StepPageWrapper({ children }: StepPageWrapperProps) {
  const { study, studyId } = useStudySetup()
  return <>{children(study, studyId)}</>
}
