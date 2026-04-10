import { Suspense } from "react"
import type {
  JatosMetadata,
  JatosStudyProperties,
  EnrichedJatosStudyResult,
} from "@/src/types/jatos"
import ResultsCard from "./client/ResultsCard"
import { LoadingMessage } from "@/src/app/components/LoadingStates"

interface ResultsCardWrapperProps {
  jatosStudyId: number
  metadata: JatosMetadata
  properties: JatosStudyProperties
  studyId: number
  initialEnrichedResults: EnrichedJatosStudyResult[]
  hasApprovedExtraction: boolean
}

export default function ResultsCardWrapper(props: ResultsCardWrapperProps) {
  return (
    <Suspense fallback={<LoadingMessage message="Loading results..." />}>
      <ResultsCard
        jatosStudyId={props.jatosStudyId}
        metadata={props.metadata}
        properties={props.properties}
        initialEnrichedResults={props.initialEnrichedResults}
        studyId={props.studyId}
        hasApprovedExtraction={props.hasApprovedExtraction}
      />
    </Suspense>
  )
}
