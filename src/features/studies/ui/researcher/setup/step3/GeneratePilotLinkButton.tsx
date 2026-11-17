"use client"

import { useState, type ReactNode } from "react"
import toast from "react-hot-toast"
import { createResearcherPilotUrlAndSaveAction } from "@/src/features/studies/actions/createResearcherPilotUrl"
import { PILOT_LINK_LABEL_MAX_LENGTH } from "@/src/features/studies/domain/pilotLinkLabel"
import { AsyncButton } from "@/src/components/ui/AsyncButton"
import { TextInput } from "@/src/components/ui/fields"
import Modal from "@/src/components/ui/Modal"

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

/** Opens a small dialog where the researcher can name the new pilot link before generating it. */
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
  const [open, setOpen] = useState(false)
  const [linkName, setLinkName] = useState("")

  const handleClose = () => {
    setOpen(false)
    setLinkName("")
  }

  const handleGenerate = async () => {
    try {
      const runUrl = await createResearcherPilotUrlAndSaveAction({
        studyId,
        studyResearcherId,
        jatosStudyUploadId,
        jatosStudyId,
        jatosBatchId,
        label: linkName,
      })

      toast.success("Pilot link generated successfully!")
      handleClose()
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
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label && children ? (
          <span className="flex items-center gap-2">
            <span>{label}</span>
            {children}
          </span>
        ) : (
          children || label
        )}
      </button>

      <Modal open={open} size="max-w-sm">
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold">Generate pilot link</h3>

          <TextInput
            id="pilot-link-name"
            label="Link name (optional)"
            labelHint="Helps you recognize this link's runs in the Inspector, for example when you pilot different response behaviors."
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            maxLength={PILOT_LINK_LABEL_MAX_LENGTH}
            placeholder="e.g. fast responder"
            className="w-full"
          />

          <div className="flex items-center justify-between gap-2">
            <button className="btn btn-ghost" onClick={handleClose} type="button">
              Cancel
            </button>
            <AsyncButton
              onClick={handleGenerate}
              loadingText="Generating"
              className="btn btn-primary"
            >
              Generate link
            </AsyncButton>
          </div>
        </div>
      </Modal>
    </>
  )
}
