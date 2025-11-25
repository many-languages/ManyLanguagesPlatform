"use client"

import { useMemo } from "react"
import {
  extractVariables,
  extractAllVariables,
  extractAvailableFields,
} from "../../variables/utils/extractVariable"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

export interface UseVariableExtractionOptions {
  enrichedResult: EnrichedJatosStudyResult
  includeExample?: boolean
}

export function useVariableExtraction(options: UseVariableExtractionOptions) {
  const { enrichedResult, includeExample = false } = options

  const variables = useMemo(() => extractVariables(enrichedResult), [enrichedResult])

  const allVariables = useMemo(() => extractAllVariables(enrichedResult), [enrichedResult])

  const availableFields = useMemo(
    () => extractAvailableFields(enrichedResult, { includeExample }),
    [enrichedResult, includeExample]
  )

  return {
    variables,
    allVariables,
    availableFields,
  }
}
