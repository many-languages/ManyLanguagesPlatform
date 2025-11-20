"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { generateAndSaveResearcherTestRunUrl } from "../../../../utils/generateResearcherTestRunUrl"
import { AsyncButton } from "@/src/app/components/AsyncButton"

interface GenerateTestLinkButtonProps {
  studyResearcherId: number
  jatosStudyId: number
  jatosBatchId: number
  onGenerated?: (runUrl: string) => void // Optional callback for additional actions
  label?: string
  className?: string
  children?: ReactNode
}

export default function GenerateTestLinkButton({
  studyResearcherId,
  jatosStudyId,
  jatosBatchId,
  onGenerated,
  label = "Generate Test Link",
  className = "btn btn-primary",
  children,
}: GenerateTestLinkButtonProps) {
  const router = useRouter()

  const handleGenerate = async () => {
    try {
      const runUrl = await generateAndSaveResearcherTestRunUrl({
        studyResearcherId,
        jatosStudyId,
        jatosBatchId,
      })

      toast.success("Test link generated successfully!")
      router.refresh() // Refresh to get the new test link data
      onGenerated?.(runUrl) // Optional callback for additional actions
    } catch (error) {
      console.error("Failed to generate test link:", error)
      toast.error(
        "Failed to generate test link. Please refresh the page and try again, or contact support if the issue persists."
      )
      throw error // Re-throw so AsyncButton can handle loading state
    }
  }

  return (
    <AsyncButton onClick={handleGenerate} loadingText="Generating..." className={className}>
      {label && children ? (
        <span className="flex items-center gap-2">
          <span>{label}</span>
          {children}
        </span>
      ) : (
        children || label
      )}
    </AsyncButton>
  )
}
