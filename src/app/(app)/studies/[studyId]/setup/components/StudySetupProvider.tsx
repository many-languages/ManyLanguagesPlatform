"use client"

import { createContext, useContext } from "react"
import { StudyWithRelations } from "../../../queries/getStudy"

interface StudySetupContextValue {
  study: StudyWithRelations
  studyId: number
}

const StudySetupContext = createContext<StudySetupContextValue | null>(null)

export function StudySetupProvider({
  study,
  studyId,
  children,
}: {
  study: StudyWithRelations
  studyId: number
  children: React.ReactNode
}) {
  return (
    <StudySetupContext.Provider value={{ study, studyId }}>{children}</StudySetupContext.Provider>
  )
}

export function useStudySetup() {
  const context = useContext(StudySetupContext)
  if (!context) {
    throw new Error("useStudySetup must be used within StudySetupProvider")
  }
  return context
}
