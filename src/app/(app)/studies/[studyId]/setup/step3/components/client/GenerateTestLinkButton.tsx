"use client"

import toast from "react-hot-toast"
import { generateAndSaveResearcherTestRunUrl } from "../../../../utils/generateResearcherTestRunUrl"
import { AsyncButton } from "@/src/app/components/AsyncButton"

interface GenerateTestLinkButtonProps {
  studyResearcherId: number
  jatosStudyId: number
  jatosBatchId: number
  onGenerated?: (runUrl: string) => void
  label?: string
}

export default function GenerateTestLinkButton({
  studyResearcherId,
  jatosStudyId,
  jatosBatchId,
  onGenerated,
  label = "Generate Test Link",
}: GenerateTestLinkButtonProps) {
  const handleGenerate = async () => {
    const runUrl = await generateAndSaveResearcherTestRunUrl({
      studyResearcherId,
      jatosStudyId,
      jatosBatchId,
    })

    toast.success("Test link generated successfully!")
    onGenerated?.(runUrl)
  }

  return (
    <AsyncButton onClick={handleGenerate} loadingText="Generating..." className="btn btn-primary">
      {label}
    </AsyncButton>
  )
}
