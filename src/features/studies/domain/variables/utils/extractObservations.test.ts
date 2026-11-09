import { describe, expect, it } from "vitest"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { DEFAULT_EXTRACTION_CONFIG } from "../types"
import { extractObservations } from "./extractObservations"

function makeResult(id: number, studyState: string): EnrichedJatosStudyResult {
  return {
    id,
    studyState,
    componentResults: [
      {
        componentId: 1,
        dataContent: '{"rt": 1}',
        parsedData: { rt: id },
        detectedFormat: { format: "json" },
      },
    ],
  } as unknown as EnrichedJatosStudyResult
}

const results = [makeResult(1, "FINISHED"), makeResult(2, "FAIL"), makeResult(3, "DATA_RETRIEVED")]

function runIds(config = DEFAULT_EXTRACTION_CONFIG) {
  const { observations } = extractObservations(results, config, { diagnostics: false })
  return [...new Set(observations.map((o) => o.scopeKeys.studyResultId))]
}

describe("extractObservations run eligibility", () => {
  it("only extracts FINISHED runs by default", () => {
    expect(runIds()).toEqual([1])
  })

  it("extracts every run when includeUnfinishedRuns is on", () => {
    expect(runIds({ ...DEFAULT_EXTRACTION_CONFIG, includeUnfinishedRuns: true })).toEqual([1, 2, 3])
  })
})
