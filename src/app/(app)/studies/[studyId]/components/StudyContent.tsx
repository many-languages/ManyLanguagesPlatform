"use client"

import { StudyWithRelations } from "../../queries/getStudy"
import { ArchiveBoxIcon } from "@heroicons/react/24/outline"
import StudyInformationCard from "./StudyInformationCard"
import StudyComponentButton from "./studyComponent/StudyComponentButton"
import JatosInformationCard from "./JatosInformationCard"
import GeneratePersonalLinkButton from "./GeneratePersonalLinkButton"
import { useQuery } from "@blitzjs/rpc"
import getStudyParticipants from "../../queries/getStudyParticipants"
import RunStudyButton from "./studyComponent/RunStudyButton"
import { useSession } from "@blitzjs/auth"
import getStudyResearcher from "../../queries/getStudyResearcher"
import getStudyParticipant from "../../queries/getStudyParticipant"
import DownloadResultsButton from "./DownloadResultsButton"
import StudySummary from "./StudySummary"
import { JatosMetadata } from "@/src/types/jatos"

interface StudyContentProps {
  study: StudyWithRelations
  metadata: JatosMetadata
}

export default function StudyContent({ study, metadata }: StudyContentProps) {
  // Get user data for the study based on their role
  const { role } = useSession()

  // const [researcher] = useQuery(
  //   getStudyResearcher,
  //   { studyId: study.id },
  //   { enabled: role === "RESEARCHER" }
  // )
  const [participant] = useQuery(
    getStudyParticipant,
    { studyId: study.id },
    { enabled: role === "PARTICIPANT" }
  )
  // const [participants] = useQuery(
  //   getStudyParticipants,
  //   { studyId: study.id },
  //   { enabled: role === "RESEARCHER" }
  // )

  return (
    <main>
      <h1 className="text-3xl font-bold text-center mb-6">
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
      {/* Just participant components */}
      {role === "PARTICIPANT" && (
        <>
          {!participant ? (
            <button className="btn btn-disabled loading">Loading study...</button>
          ) : (
            <RunStudyButton runUrl={participant.jatosRunUrl} />
          )}
        </>
      )}
      {/* Just researcher components */}
      {role === "RESEARCHER" && (
        <>
          <JatosInformationCard jatosStudyUUID={study.jatosStudyUUID} />
          <DownloadResultsButton jatosStudyId={study.jatosStudyId} />
          <StudySummary metadata={metadata} />
        </>
      )}
    </main>
  )
}
