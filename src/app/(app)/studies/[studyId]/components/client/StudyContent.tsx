"use client"

import { StudyWithRelations } from "../../../queries/getStudy"
import { ArchiveBoxIcon } from "@heroicons/react/24/outline"
import StudyInformationCard from "./StudyInformationCard"
import { useSession } from "@blitzjs/auth"
import { getIncompleteStep, getNextSetupStepUrl } from "../../setup/utils/setupStatus"
import { useRouter } from "next/navigation"
import { Alert } from "@/src/app/components/Alert"
import { ParticipantWithEmail } from "../../../queries/getStudyParticipants"

interface StudyContentProps {
  study: StudyWithRelations
  feedbackTemplate?: { id: number; content: string; createdAt: Date; updatedAt: Date } | null
  participant?: {
    id: number
    pseudonym: string
    jatosRunUrl: string | null
    createdAt: Date
    active: boolean
    payed: boolean
  } | null
  initialParticipants: ParticipantWithEmail[]
  setupComplete: boolean
}

export default function StudyContent({
  study,
  feedbackTemplate,
  participant,
  initialParticipants,
  setupComplete,
}: StudyContentProps) {
  const { role } = useSession()
  const router = useRouter()

  // Use router.refresh() to refetch server data after mutations
  const handleRefreshParticipants = async () => {
    router.refresh()
  }

  const hasFeedbackTemplate = !!feedbackTemplate?.id
  const incompleteStep = getIncompleteStep(study, { hasFeedbackTemplate })

  return (
    <>
      {/* Setup incomplete alert for researchers */}
      {role === "RESEARCHER" && !setupComplete && (
        <div className="alert alert-warning mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="font-bold">Setup Incomplete</h3>
            <div className="text-sm">
              Complete the setup to open your study for participants.
              {incompleteStep && <span> Continue from Step {incompleteStep}.</span>}
            </div>
          </div>
          <button
            className="btn btn-sm btn-primary"
            onClick={() =>
              router.push(getNextSetupStepUrl(study.id, study, { hasFeedbackTemplate }) as any)
            }
          >
            Continue Setup
          </button>
        </div>
      )}

      {/* Study header */}
      <h1 className="text-3xl font-bold text-center">
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

      {/* General information */}
      <StudyInformationCard study={study} />
    </>
  )
}
