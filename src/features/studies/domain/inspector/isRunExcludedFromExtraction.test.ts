import { describe, expect, it } from "vitest"
import type { JatosStudyResult } from "@/src/types/jatos"
import { isRunExcludedFromExtraction } from "./isRunExcludedFromExtraction"

const run = (studyState: string) => ({ studyState } as unknown as JatosStudyResult)

describe("isRunExcludedFromExtraction", () => {
  it("keeps finished runs", () => {
    expect(isRunExcludedFromExtraction(run("FINISHED"))).toBe(false)
  })

  it("excludes runs that did not finish", () => {
    expect(isRunExcludedFromExtraction(run("STARTED"))).toBe(true)
    expect(isRunExcludedFromExtraction(run("DATA_RETRIEVED"))).toBe(true)
    expect(isRunExcludedFromExtraction(run("ABORTED"))).toBe(true)
  })

  it("keeps unfinished runs when the config includes them", () => {
    expect(isRunExcludedFromExtraction(run("STARTED"), { includeUnfinishedRuns: true })).toBe(false)
  })
})
