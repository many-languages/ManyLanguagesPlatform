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
import ParticipantManagementCard from "./ParticipantManagementCard"

interface StudyContentProps {
  study: StudyWithRelations
  metadata: JatosMetadata
}

export default function StudyContent({ study, metadata }: StudyContentProps) {
  // Get user data for the study based on their role
  const { role } = useSession()
  // Get the ResearcherStudy persona of the user IF they are a RESEARCHER on the study
  // const [researcher] = useQuery(
  //   getStudyResearcher,
  //   { studyId: study.id },
  //   { enabled: role === "RESEARCHER" }
  // )
  // Get the StudyParticipant persona of the user IF they are a PARTICIPANT on the study
  const [participant] = useQuery(
    getStudyParticipant,
    { studyId: study.id },
    { enabled: role === "PARTICIPANT" }
  )
  // Get all participants and their emails assigned to the study
  const [participants, { refetch: refetchParticipants }] = useQuery(
    getStudyParticipants,
    { studyId: study.id },
    { enabled: role === "RESEARCHER" }
  )

  return (
    <main>
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
      {role === "RESEARCHER" && <StudySummary metadata={metadata} />}

      {/* General information */}
      <StudyInformationCard study={study} />

      {/* Just participant components */}
      {role === "PARTICIPANT" && (
        // Button to start responding
        <>
          {!participant ? (
            <button className="btn btn-disabled loading">Loading study...</button>
          ) : (
            <RunStudyButton runUrl={participant.jatosRunUrl} isActive={participant.active} />
          )}
        </>
      )}

      {/* Just researcher components */}
      {role === "RESEARCHER" && (
        <>
          {/* <DownloadResultsButton jatosStudyId={study.jatosStudyId} /> */}
          {/* Manage participants for the study */}
          <ParticipantManagementCard
            participants={participants ?? []}
            metadata={metadata}
            onRefresh={refetchParticipants}
          />
          {/* Information about the study fetched from JATOS */}
          <JatosInformationCard jatosStudyUUID={study.jatosStudyUUID} />
        </>
      )}
    </main>
  )
}
