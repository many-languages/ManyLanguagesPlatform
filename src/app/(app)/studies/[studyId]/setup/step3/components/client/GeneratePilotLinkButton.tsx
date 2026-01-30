"use client"

import type { ReactNode } from "react"
import toast from "react-hot-toast"
import { generateAndSaveResearcherPilotRunUrl } from "../../../../utils/generateResearcherPilotRunUrl"
import { AsyncButton } from "@/src/app/components/AsyncButton"

interface GeneratePilotLinkButtonProps {
  studyId: number // Added
  studyResearcherId: number
  jatosStudyUploadId: number
  jatosStudyId: number
  jatosBatchId: number
  onGenerated?: (runUrl: string) => void // Optional callback for additional actions
  label?: string
  className?: string
  children?: ReactNode
}

export default function GeneratePilotLinkButton({
  studyId,
  studyResearcherId,
  jatosStudyUploadId,
  jatosStudyId,
  jatosBatchId,
  onGenerated,
  label = "Generate Pilot Link",
  className = "btn btn-primary",
  children,
}: GeneratePilotLinkButtonProps) {
  const handleGenerate = async () => {
    try {
      const runUrl = await generateAndSaveResearcherPilotRunUrl({
        studyId,
        studyResearcherId,
        jatosStudyUploadId,
        jatosStudyId,
        jatosBatchId,
      })

      toast.success("Pilot link generated successfully!")
      onGenerated?.(runUrl) // Optional callback for additional actions
    } catch (error) {
      console.error("Failed to generate pilot link:", error)
      toast.error(
        "Failed to generate pilot link. Please refresh the page and try again, or contact support if the issue persists."
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
