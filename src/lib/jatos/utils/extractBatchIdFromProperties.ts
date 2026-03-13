import type { JatosStudyProperties } from "@/src/types/jatos"

/**
 * Extracts the first batch ID from JATOS study properties.
 * Pure transform - no HTTP, no token.
 */
export function extractBatchIdFromProperties(properties: JatosStudyProperties): number | null {
  const batches = properties?.batches ?? []
  return batches.length > 0 ? batches[0].id : null
}
