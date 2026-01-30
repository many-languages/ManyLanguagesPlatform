"use client"

import SaveExitButton from "./SaveExitButton"

interface SetupStepHeaderProps {
  studyId: number
  title: string
  showSaveExit?: boolean
}

export default function SetupStepHeader({
  studyId,
  title,
  showSaveExit = true,
}: SetupStepHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="w-32 flex justify-start">
        {showSaveExit && <SaveExitButton studyId={studyId} />}
      </div>
      <h2 className="text-xl font-semibold text-center flex-1">{title}</h2>
      <div className="w-32" /> {/* Spacer to balance the layout */}
    </div>
  )
}
