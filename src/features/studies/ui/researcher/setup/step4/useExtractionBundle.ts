"use client"

import { useState, useEffect, useMemo } from "react"
import { useMutation, useQuery } from "@blitzjs/rpc"

import runExtraction from "@/src/features/studies/mutations/runExtraction"
import getCachedExtractionBundle from "@/src/features/studies/queries/getCachedExtractionBundle"
import type { SerializedExtractionBundle } from "../../../../domain/setup/serializeExtractionBundle"
import { aggregateExtractionStats } from "../../../../domain/inspector/aggregateExtractionStats"
import type { ValidationData } from "@/src/features/studies/server/getValidationData"

interface UseExtractionBundleParams {
  studyId: number
  validationData: ValidationData
}

interface UseExtractionBundleResult {
  activeBundle: SerializedExtractionBundle | null
  hasExtractedVariables: boolean
  dashboardStats: ReturnType<typeof aggregateExtractionStats> | null
  handleRunExtraction: () => Promise<void>
}

export function useExtractionBundle({
  studyId,
  validationData,
}: UseExtractionBundleParams): UseExtractionBundleResult {
  const [runExtractionMutation] = useMutation(runExtraction)
  const hasPilotResults = validationData.pilotResults.length > 0
  const [extractionBundle, setExtractionBundle] = useState<SerializedExtractionBundle | null>(null)

  // Reset the local run result whenever pilot availability changes
  useEffect(() => {
    setExtractionBundle(null)
  }, [hasPilotResults])

  const [cachedBundleResult] = useQuery(
    getCachedExtractionBundle,
    { studyId, includeDiagnostics: true },
    { enabled: hasPilotResults }
  )

  const activeBundle = extractionBundle ?? cachedBundleResult?.bundle ?? null
  const hasExtractedVariables = (activeBundle?.variables.length ?? 0) > 0

  const dashboardStats = useMemo(
    () =>
      activeBundle
        ? aggregateExtractionStats(
            activeBundle.diagnostics,
            activeBundle.variables.length,
            validationData.pilotResults.length
          )
        : null,
    [activeBundle, validationData.pilotResults.length]
  )

  const handleRunExtraction = async () => {
    try {
      const result = await runExtractionMutation({ studyId, includeDiagnostics: true })
      setExtractionBundle(result.bundle)
    } catch (error) {
      console.error("Failed to run extraction:", error)
    }
  }

  return { activeBundle, hasExtractedVariables, dashboardStats, handleRunExtraction }
}
