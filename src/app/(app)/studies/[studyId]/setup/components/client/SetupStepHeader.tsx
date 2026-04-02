"use client"

import BackToStudyButton from "./BackToStudyButton"

interface SetupStepHeaderProps {
  studyId: number
  title: string
  showBackToStudy?: boolean
}

export default function SetupStepHeader({
  studyId,
  title,
  showBackToStudy = true,
}: SetupStepHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="w-32 flex justify-start">
        {showBackToStudy && <BackToStudyButton studyId={studyId} />}
      </div>
      <h2 className="text-xl font-semibold text-center flex-1">{title}</h2>
      <div className="w-32" /> {/* Spacer to balance the layout */}
    </div>
  )
}
