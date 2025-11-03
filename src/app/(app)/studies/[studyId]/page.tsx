import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getStudyRsc } from "../queries/getStudy"
import StudyContent from "./components/client/StudyContent"
import { getStudyParticipantRsc } from "../queries/getStudyParticipant"
import { getBlitzContext } from "@/src/app/blitz-server"
import { getFeedbackTemplateRsc } from "./setup/step4/queries/getFeedbackTemplate"
import { getStudyParticipantsRsc } from "../queries/getStudyParticipants"
import JatosDataFetcher from "./components/JatosDataFetcher"
import ParticipantData from "./components/RoleSpecificDataFetcher"
import { Alert } from "@/src/app/components/Alert"
import { isSetupComplete } from "./setup/utils/setupStatus"

export default async function StudyPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    const { session } = await getBlitzContext()
    if (!session.userId) {
      throw new Error("Not authenticated")
    }

    // Fetch core study data first (always needed for progressive loading)
    const study = await getStudyRsc(studyId)

    // Prefetch role-specific data in parallel (for initial render)
    const [feedbackTemplate, participant, participants] = await Promise.all([
      // Only fetch feedback template if user is a researcher
      session.role === "RESEARCHER"
        ? getFeedbackTemplateRsc(studyId).catch(() => null)
        : Promise.resolve(null),
      // Only fetch participant data if user is a participant
      session.role === "PARTICIPANT"
        ? getStudyParticipantRsc(studyId).catch(() => null)
        : Promise.resolve(null),
      // Prefetch participants for researchers (needed for ParticipantManagementCard)
      session.role === "RESEARCHER"
        ? getStudyParticipantsRsc(studyId).catch(() => [])
        : Promise.resolve([]),
    ])

    const hasFeedbackTemplate = !!feedbackTemplate?.id
    const setupComplete = isSetupComplete(study, { hasFeedbackTemplate })

    return (
      <main>
        {/* Pass all data to client component - it handles rendering core study data */}
        <StudyContent
          study={study}
          feedbackTemplate={feedbackTemplate}
          participant={participant}
          initialParticipants={participants}
          setupComplete={setupComplete}
        />

        {/* JATOS data - progressive loading via Suspense (only for researchers with JATOS study) */}
        {session.role === "RESEARCHER" &&
          study.jatosStudyId &&
          study.jatosStudyUUID &&
          setupComplete && (
            <Suspense fallback={<div className="skeleton h-32 w-full mt-4" />}>
              <JatosDataFetcher
                jatosStudyId={study.jatosStudyId}
                jatosStudyUUID={study.jatosStudyUUID}
                participants={participants}
              />
            </Suspense>
          )}

        {/* Show info alert if JATOS not imported yet */}
        {session.role === "RESEARCHER" && (!study.jatosStudyId || !study.jatosStudyUUID) && (
          <Alert variant="info" className="mt-4">
            <p>Complete Step 2 of setup to import your JATOS study.</p>
          </Alert>
        )}

        {/* Participant-specific data - progressive loading via Suspense */}
        {session.role === "PARTICIPANT" && setupComplete && (
          <Suspense fallback={<div className="skeleton h-16 w-full mt-4" />}>
            <ParticipantData studyId={studyId} setupComplete={setupComplete} />
          </Suspense>
        )}
      </main>
    )
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
