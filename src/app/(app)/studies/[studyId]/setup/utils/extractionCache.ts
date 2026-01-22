import { createHash } from "crypto"
import { buildExtractionCacheKey } from "./extractionBundleCache"

export const EXTRACTOR_VERSION = "v1"
export const REQUIRED_KEYS_HASH = "full"

export function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

export function buildPilotDatasetHash(studyId: number, runIds: number[]): string {
  return hashJson({ studyId, runIds })
}

function buildRequiredKeysHash(includeDiagnostics: boolean): string {
  return `${REQUIRED_KEYS_HASH}:${includeDiagnostics ? "diag" : "nodiag"}`
}

export function buildCacheKey(options: {
  studyId: number
  pilotDatasetHash: string
  includeDiagnostics: boolean
}): string {
  return buildExtractionCacheKey({
    studyId: options.studyId,
    pilotDatasetHash: options.pilotDatasetHash,
    extractorVersion: EXTRACTOR_VERSION,
    requiredKeysHash: buildRequiredKeysHash(options.includeDiagnostics),
  })
}
