"use client"

import { Study } from "@/db"
import Card from "@/src/app/components/Card"

interface StudyHeaderProps {
  study: Study
}

export default function StudyHeader({ study }: StudyHeaderProps) {
  return (
    <Card title={study.title} bgColor="bg-base-200">
      <p className="text-sm text-muted-content">
        <span className="font-bold">JATOS Study ID:</span> {study.jatosStudyId} |{" "}
        <span className="font-bold">Study ID:</span> {study.id}
        {study.jatosStudyUUID && (
          <>
            {" "}
            | <span className="font-bold">UUID:</span> {study.jatosStudyUUID}
          </>
        )}
      </p>
    </Card>
  )
}
