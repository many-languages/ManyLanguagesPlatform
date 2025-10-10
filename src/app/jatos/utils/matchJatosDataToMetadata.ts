import type {
  JatosMetadata,
  EnrichedJatosStudyResult,
  EnrichedJatosComponentResult,
} from "@/src/types/jatos"

/**
 * Enrich JATOS studyResults with actual data file contents.
 * - Matches components by their `path` field in metadata.
 * - Skips components with no data (size = 0).
 * - Adds `dataContent` field with the raw content.
 *
 * @param metadata Full JATOS metadata object
 * @param files Parsed files from JATOS ZIP: { filename, content }[]
 * @returns Array of enriched JatosStudyResult objects
 */
export function matchJatosDataToMetadata(
  metadata: JatosMetadata,
  files: { filename: string; content: string }[]
): EnrichedJatosStudyResult[] {
  const studyResults = metadata?.data?.[0]?.studyResults ?? []

  return studyResults.map((studyResult) => ({
    ...studyResult,
    componentResults: studyResult.componentResults.map((component) => {
      // sanity check: only try to match if data are present
      const hasData = component.data?.size && component.data.size > 0
      let matchedContent: string | null = null
      let parsedData: any = undefined

      if (hasData) {
        // Normalize paths
        const cleanPath = component.path.replace(/^\//, "")
        matchedContent = files.find((f) => f.filename.includes(cleanPath))?.content ?? null

        if (matchedContent) {
          try {
            parsedData = JSON.parse(matchedContent)
          } catch {
            parsedData = undefined // not JSON, maybe CSV or text
          }
        }
      }
      return {
        ...component,
        dataContent: matchedContent,
        parsedData,
      } satisfies EnrichedJatosComponentResult
    }),
  }))
}
