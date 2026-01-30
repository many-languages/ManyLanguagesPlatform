import type {
  JatosMetadata,
  EnrichedJatosStudyResult,
  EnrichedJatosComponentResult,
} from "@/src/types/jatos"
import { parseData } from "../parsers"
import type { FormatDetectionResult } from "../parsers/formatDetector"

/**
 * Enrich JATOS studyResults with actual data file contents.
 * - Matches components by their `path` field in metadata.
 * - Skips components with no data (size = 0).
 * - Adds `dataContent` field with the raw content.
 * - Uses format detection and appropriate parsers (JSON, CSV, TSV, text).
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
      let detectedFormat: FormatDetectionResult | undefined = undefined
      let parseError: string | undefined = undefined

      if (hasData) {
        // Normalize paths
        const cleanPath = component.path.replace(/^\//, "")
        matchedContent = files.find((f) => f.filename.includes(cleanPath))?.content ?? null

        if (matchedContent) {
          // Use unified parser to detect format and parse
          const parseResult = parseData(matchedContent)
          detectedFormat = parseResult.format

          if (parseResult.success) {
            parsedData = parseResult.data
          } else {
            // Parsing failed - preserve error info but keep raw content
            parseError = parseResult.error
            parsedData = undefined
          }
        }
      }

      return {
        ...component,
        dataContent: matchedContent,
        parsedData,
        detectedFormat,
        parseError,
      } satisfies EnrichedJatosComponentResult
    }),
  }))
}
