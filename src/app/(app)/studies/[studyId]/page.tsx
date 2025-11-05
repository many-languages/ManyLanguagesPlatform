import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getStudyRsc } from "../queries/getStudy"
import { getStudyParticipantRsc } from "../queries/getStudyParticipant"
import { getBlitzContext } from "@/src/app/blitz-server"
import { getFeedbackTemplateRsc } from "./setup/step4/queries/getFeedbackTemplate"
import { getStudyParticipantsRsc } from "../queries/getStudyParticipants"
import JatosDataFetcher from "./components/JatosDataFetcher"
import ParticipantData from "./components/RoleSpecificDataFetcher"
import { Alert } from "@/src/app/components/Alert"
import { isSetupComplete } from "./setup/utils/setupStatus"
import SetupProgressCard from "./setup/components/SetupProgressCard"
import StudyHeader from "./components/StudyHeader"
import StudyInformationCard from "./components/client/StudyInformationCard"

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

    const setupComplete = isSetupComplete(study)

    return (
      <main>
        {/* Study header */}
        <StudyHeader study={study} />

        {/* Setup Progress Card for researchers */}
        {session.role === "RESEARCHER" && <SetupProgressCard study={study} />}

        {/* Study information */}
        <StudyInformationCard study={study} />

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
