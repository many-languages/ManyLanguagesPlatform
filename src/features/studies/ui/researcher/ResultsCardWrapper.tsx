import { Suspense } from "react"
import type { ResearcherResultComponentOption } from "../../types"
import type { ResearcherRawResultInspectorPayload } from "../../server/loadResearcherStudyData"
import ResultsCard from "./ResultsCard"
import { LoadingMessage } from "@/src/components/ui/LoadingStates"

interface ResultsCardWrapperProps {
  jatosStudyId: number
  resultComponents: ResearcherResultComponentOption[]
  rawResultInspectorPayload: ResearcherRawResultInspectorPayload
  studyId: number
  hasApprovedExtraction: boolean
  hasResults: boolean
}

export default function ResultsCardWrapper(props: ResultsCardWrapperProps) {
  return (
    <Suspense fallback={<LoadingMessage message="Loading results..." />}>
      <ResultsCard
        jatosStudyId={props.jatosStudyId}
        resultComponents={props.resultComponents}
        rawResultInspectorPayload={props.rawResultInspectorPayload}
        studyId={props.studyId}
        hasApprovedExtraction={props.hasApprovedExtraction}
        hasResults={props.hasResults}
      />
    </Suspense>
  )
}
