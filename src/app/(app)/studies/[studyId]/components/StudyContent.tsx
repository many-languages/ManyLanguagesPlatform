"use client"

import { StudyWithRelations } from "../../queries/getStudy"
import { ArchiveBoxIcon } from "@heroicons/react/24/outline"
import StudyInformationCard from "./StudyInformationCard"
import StudyComponentButton from "./studyComponent/StudyComponentButton"
import JatosInformationCard from "./JatosInformationCard"

interface StudyContentProps {
  study: StudyWithRelations
}

export default function StudyContent({ study }: StudyContentProps) {
  return (
    <main>
      <h1 className="text-3xl font-bold text-center mb-6">
        <span className="inline-flex items-center gap-2">
          {study?.archived && (
            <ArchiveBoxIcon
              className="h-6 w-6"
              title="Archived study"
              aria-label="Archived study"
            />
          )}
          {study?.title}
        </span>
      </h1>
      <StudyInformationCard study={study} />
      <JatosInformationCard jatosStudyUUID={study.jatosStudyUUID} />
      <StudyComponentButton study={study} />
    </main>
  )
}
