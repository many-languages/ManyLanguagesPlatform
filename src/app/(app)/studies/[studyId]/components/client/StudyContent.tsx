"use client"

import { StudyWithRelations } from "../../../queries/getStudy"
import { ArchiveBoxIcon } from "@heroicons/react/24/outline"
import StudyInformationCard from "./StudyInformationCard"
import StudyComponentButton from "./StudyComponentButton"
import JatosInformationCard from "./JatosInformationCard"
import { useQuery } from "@blitzjs/rpc"
import getStudyParticipants from "../../../queries/getStudyParticipants"
import RunStudyButton from "../../setup/step3/components/client/RunStudyButton"
import { useSession } from "@blitzjs/auth"
import DownloadResultsButton from "./DownloadResultsButton"
import StudySummary from "./StudySummary"
import { JatosMetadata, JatosStudyProperties } from "@/src/types/jatos"
import ParticipantManagementCard from "./ParticipantManagementCard"
import ResultsCard from "./ResultsCard"
import {
  isSetupComplete,
  getIncompleteStep,
  getNextSetupStepUrl,
} from "../../setup/utils/setupStatus"
import { useRouter } from "next/navigation"

interface StudyContentProps {
  study: StudyWithRelations
  metadata?: JatosMetadata | null
  properties?: JatosStudyProperties | null
  feedbackTemplate?: { id: number; content: string; createdAt: Date; updatedAt: Date } | null
  participant?: {
    id: number
    pseudonym: string
    jatosRunUrl: string | null
    createdAt: Date
    active: boolean
    payed: boolean
  } | null
}

export default function StudyContent({
  study,
  metadata,
  properties,
  feedbackTemplate,
  participant: initialParticipant,
}: StudyContentProps) {
  // Get user data for the study based on their role
  const { role } = useSession()
  const router = useRouter()

  // Use server-fetched feedback template
  const hasFeedbackTemplate = !!feedbackTemplate?.id

  // Check setup completion status with optional override for template presence
  const setupComplete = isSetupComplete(study, { hasFeedbackTemplate })
  const incompleteStep = getIncompleteStep(study, { hasFeedbackTemplate })

  // Use server-fetched participant data
  const participant = initialParticipant

  // Get all participants and their emails assigned to the study
  // Keep as useQuery because it needs reactive refetching after mutations
  const [participants, { refetch: refetchParticipants }] = useQuery(
    getStudyParticipants,
    { studyId: study.id },
    { enabled: role === "RESEARCHER" }
  )

  return (
    <main>
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

      {/* Summary statistics of the study */}
      {role === "RESEARCHER" && metadata && <StudySummary metadata={metadata} />}

      {/* General information */}
      <StudyInformationCard study={study} />

      {/* Participant view */}
      {role === "PARTICIPANT" && (
        <>
          {study.status === "CLOSED" || !setupComplete ? (
            <div className="alert alert-warning mt-4">
              <p>This study is not currently accepting participants.</p>
            </div>
          ) : !participant ? (
            <button className="btn btn-disabled loading">Loading study...</button>
          ) : (
            <RunStudyButton runUrl={participant.jatosRunUrl} isActive={participant.active} />
          )}
        </>
      )}

      {/* Researcher view - only show JATOS cards if step 2 complete */}
      {role === "RESEARCHER" &&
      study?.jatosStudyUUID &&
      study?.jatosStudyId &&
      metadata &&
      properties ? (
        <>
          {/* Manage participants for the study */}
          <ParticipantManagementCard
            participants={participants ?? []}
            metadata={metadata}
            onRefresh={refetchParticipants}
          />

          {/* Showing detailed results */}
          <ResultsCard
            jatosStudyId={study.jatosStudyId}
            metadata={metadata}
            properties={properties}
          />
          {/* Information about the study fetched from JATOS */}
          <JatosInformationCard properties={properties} />
        </>
      ) : (
        role === "RESEARCHER" && (
          <div className="alert alert-info mt-4">
            <p>Complete Step 2 of setup to import your JATOS study.</p>
          </div>
        )
      )}
    </main>
  )
}
