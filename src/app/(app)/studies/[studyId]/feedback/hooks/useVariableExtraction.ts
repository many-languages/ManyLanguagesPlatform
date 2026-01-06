"use client"

import { useMemo } from "react"
import { extractVariables } from "../../variables/utils/extractVariable"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

export interface UseVariableExtractionOptions {
  enrichedResult: EnrichedJatosStudyResult
  includeExample?: boolean
}

export function useVariableExtraction(options: UseVariableExtractionOptions) {
  const { enrichedResult } = options

  const extractionResult = useMemo(() => extractVariables(enrichedResult), [enrichedResult])
  const variables = extractionResult.variables

  return {
    variables,
  }
}
