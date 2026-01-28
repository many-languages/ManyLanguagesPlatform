"use client"

import Card from "@/src/app/components/Card"

interface StudyHeaderProps {
  study: {
    id: number
    title: string
    jatosStudyUUID?: string | null
    latestJatosStudyUpload?: { jatosStudyId?: number | null } | null
  }
}

export default function StudyHeader({ study }: StudyHeaderProps) {
  const jatosStudyId = study.latestJatosStudyUpload?.jatosStudyId ?? null
  return (
    <Card title={study.title} bgColor="bg-base-200">
      <p className="text-sm text-muted-content">
        <span className="font-bold">JATOS Study ID:</span> {jatosStudyId ?? "—"} |{" "}
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
