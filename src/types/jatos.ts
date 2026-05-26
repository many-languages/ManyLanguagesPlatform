import type { FormatDetectionResult } from "@/src/lib/jatos/parsers/formatDetector"
import type {
  JatosBatch,
  JatosComponent,
  JatosComponentResult,
  JatosDataInfo,
  JatosFileInfo,
  JatosMember,
  JatosMetadata,
  JatosMetadataStudy,
  JatosStudyProperties,
  JatosStudyResult,
  JatosWorkerType,
} from "@/src/lib/jatos/schemas/responses"

export type {
  JatosBatch,
  JatosComponent,
  JatosComponentResult,
  JatosDataInfo,
  JatosFileInfo,
  JatosMember,
  JatosMetadata,
  JatosMetadataStudy,
  JatosStudyProperties,
  JatosStudyResult,
  JatosWorkerType,
}

// Extended version of JatosComponentResult with actual data fields.
export interface EnrichedJatosComponentResult extends JatosComponentResult {
  dataContent: string | null
  parsedData?: unknown
  detectedFormat?: FormatDetectionResult
  parseError?: string
}

// Extended version of JatosStudyResult that uses the enriched components.
export interface EnrichedJatosStudyResult extends JatosStudyResult {
  componentResults: EnrichedJatosComponentResult[]
}
