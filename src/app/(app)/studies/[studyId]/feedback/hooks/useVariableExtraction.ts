"use client"

import { useMemo } from "react"
import { extractVariables, extractAvailableVariables } from "../../variables/utils/extractVariable"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

export interface UseVariableExtractionOptions {
  enrichedResult: EnrichedJatosStudyResult
  includeExample?: boolean
}

export function useVariableExtraction(options: UseVariableExtractionOptions) {
  const { enrichedResult, includeExample = false } = options

  const variables = useMemo(() => extractVariables(enrichedResult).variables, [enrichedResult])

  const availableVariables = useMemo(
    () => extractAvailableVariables(enrichedResult, { includeExample }),
    [enrichedResult, includeExample]
  )

  return {
    variables,
    availableVariables,
  }
}
