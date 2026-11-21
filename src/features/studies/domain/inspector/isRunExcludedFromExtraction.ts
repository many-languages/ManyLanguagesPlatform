import type { JatosStudyResult } from "@/src/types/jatos"
import { isFinishedResult } from "@/src/lib/jatos/utils/findStudyResultIdByComment"
import { DEFAULT_EXTRACTION_CONFIG, type ExtractionConfig } from "../variables/types"

/**
 * Whether the extraction skips this pilot run. Mirrors the run filter in `extractObservations`
 * so the UI can flag runs that are listed but contribute no variables or diagnostics.
 */
export function isRunExcludedFromExtraction(
  result: JatosStudyResult,
  config: Pick<ExtractionConfig, "includeUnfinishedRuns"> = DEFAULT_EXTRACTION_CONFIG
): boolean {
  return !config.includeUnfinishedRuns && !isFinishedResult(result)
}
