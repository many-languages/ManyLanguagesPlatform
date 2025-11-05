import { cache } from "react"
import { Suspense } from "react"
import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { parseJatosZip } from "@/src/lib/jatos/api/parseJatosZip"
import { matchJatosDataToMetadata } from "@/src/lib/jatos/api/matchJatosDataToMetadata"
import type {
  JatosMetadata,
  JatosStudyProperties,
  EnrichedJatosStudyResult,
} from "@/src/types/jatos"
import ResultsCard from "./client/ResultsCard"
import { LoadingMessage } from "@/src/app/components/LoadingStates"
import { Alert } from "@/src/app/components/Alert"

interface ResultsCardWrapperProps {
  jatosStudyId: number
  metadata: JatosMetadata
  properties: JatosStudyProperties
  studyId: number
}

// Cached server-side function to fetch enriched results
const getEnrichedResultsRsc = cache(
  async (jatosStudyId: number, metadata: JatosMetadata): Promise<EnrichedJatosStudyResult[]> => {
    try {
      // Fetch ZIP from JATOS (server-side)
      const result = await getResultsData({ studyIds: String(jatosStudyId) })

      if (!result.success) {
        throw new Error("Failed to fetch results from JATOS")
      }

      // Parse ZIP (server-side)
      const files = await parseJatosZip(result.data)

      // Match and enrich data (server-side)
      return matchJatosDataToMetadata(metadata, files)
    } catch (error: any) {
      console.error("Error fetching enriched results:", error)
      throw new Error(error.message || "Failed to fetch and process results")
    }
  }
)

async function ResultsCardContent({
  jatosStudyId,
  metadata,
  properties,
  studyId,
}: ResultsCardWrapperProps) {
  try {
    const enrichedResults = await getEnrichedResultsRsc(jatosStudyId, metadata)

    return (
      <ResultsCard
        jatosStudyId={jatosStudyId}
        metadata={metadata}
        properties={properties}
        initialEnrichedResults={enrichedResults}
        studyId={studyId}
      />
    )
  } catch (error: any) {
    return (
      <Alert variant="error" className="mt-6">
        <p>Failed to load results: {error.message}</p>
      </Alert>
    )
  }
}

export default function ResultsCardWrapper(props: ResultsCardWrapperProps) {
  return (
    <Suspense fallback={<LoadingMessage message="Loading results..." />}>
      <ResultsCardContent {...props} />
    </Suspense>
  )
}
