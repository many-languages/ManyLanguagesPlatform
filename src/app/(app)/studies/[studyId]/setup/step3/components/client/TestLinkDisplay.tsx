"use client"

import GenerateTestLinkButton from "./GenerateTestLinkButton"

interface TestLinkDisplayProps {
  runUrl: string
  studyResearcherId: number
  jatosStudyId: number
  jatosBatchId: number
  onRegenerated?: (runUrl: string) => void
}

export default function TestLinkDisplay({
  runUrl,
  studyResearcherId,
  jatosStudyId,
  jatosBatchId,
  onRegenerated,
}: TestLinkDisplayProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Test link:</span>
        <a
          href={runUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link link-primary text-sm break-all"
        >
          {runUrl}
        </a>
      </div>
      <GenerateTestLinkButton
        studyResearcherId={studyResearcherId}
        jatosStudyId={jatosStudyId}
        jatosBatchId={jatosBatchId}
        onGenerated={onRegenerated}
        label="Re-generate test link"
      />
    </div>
  )
}
