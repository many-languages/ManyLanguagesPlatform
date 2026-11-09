import { describe, expect, it } from "vitest"
import type { JatosMetadata } from "@/src/types/jatos"
import { JatosMetadataSchema } from "../schemas"
import {
  findLatestStudyResultSelectionByComment,
  findStudyResultByPseudonym,
  findStudyResultIdByComment,
  hasCompletedStudy,
} from "./findStudyResultIdByComment"

type ResultInput = {
  id: number
  comment: string
  studyState: string
  endDate: number | null
}

const result = ({ id, comment, studyState, endDate }: ResultInput) => ({
  id,
  uuid: `uuid-${id}`,
  studyCode: `code-${id}`,
  comment,
  startDate: 1000,
  endDate,
  duration: endDate === null ? null : "00:00:10",
  lastSeenDate: 2000,
  studyState,
  workerId: id,
  workerType: "PersonalSingle",
  batchId: 1,
  batchUuid: "batch",
  batchTitle: "Default",
  groupId: null,
  componentResults: [
    {
      id,
      componentId: 5,
      componentUuid: "component",
      startDate: 1000,
      endDate,
      duration: endDate === null ? null : "00:00:10",
      componentState: studyState === "FINISHED" ? "FINISHED" : "DATA_RETRIEVED",
      path: `/study_result_${id}/comp-result_${id}`,
      data: { size: 0, sizeHumanReadable: "0 B" },
      files: [],
    },
  ],
})

const metadataFor = (results: ResultInput[]): JatosMetadata =>
  JatosMetadataSchema.parse({
    data: [{ studyId: 7, studyUuid: "s", studyTitle: "Study", studyResults: results.map(result) }],
  })

const UNFINISHED = { id: 8, comment: "p1", studyState: "DATA_RETRIEVED", endDate: null }
const FINISHED = { id: 6, comment: "p1", studyState: "FINISHED", endDate: 5000 }

describe("JatosMetadataSchema", () => {
  it("accepts unfinished runs, which JATOS reports with null endDate and duration", () => {
    const metadata = metadataFor([UNFINISHED])

    const studyResult = metadata.data[0]!.studyResults[0]!
    expect(studyResult.endDate).toBeNull()
    expect(studyResult.duration).toBeNull()
    expect(studyResult.componentResults[0]!.endDate).toBeNull()
  })
})

describe("findStudyResultIdByComment", () => {
  it("matches a run in any state by default (pilot lookups)", () => {
    expect(findStudyResultIdByComment(metadataFor([UNFINISHED]), "p1")).toBe(8)
  })

  it("matches only FINISHED runs with finishedOnly", () => {
    const options = { finishedOnly: true }
    expect(findStudyResultIdByComment(metadataFor([UNFINISHED]), "p1", options)).toBeNull()
    expect(findStudyResultIdByComment(metadataFor([UNFINISHED, FINISHED]), "p1", options)).toBe(6)
  })
})

describe("findLatestStudyResultSelectionByComment", () => {
  it("ignores unfinished runs", () => {
    expect(findLatestStudyResultSelectionByComment(metadataFor([UNFINISHED]), "p1")).toEqual({
      resultId: null,
      matchCount: 0,
      selectedEndDate: null,
    })
  })

  it("picks the latest finished run", () => {
    const older = { ...FINISHED, id: 4, endDate: 3000 }
    const selection = findLatestStudyResultSelectionByComment(
      metadataFor([older, UNFINISHED, FINISHED]),
      "p1"
    )

    expect(selection).toEqual({ resultId: 6, matchCount: 2, selectedEndDate: 5000 })
  })
})

describe("hasCompletedStudy / findStudyResultByPseudonym", () => {
  it("do not treat an unfinished run as completed", () => {
    const metadata = metadataFor([UNFINISHED])

    expect(hasCompletedStudy(metadata, 7, "p1")).toBe(false)
    expect(findStudyResultByPseudonym(metadata, 7, "p1")).toBeNull()
  })

  it("report a finished run with its end date", () => {
    const metadata = metadataFor([UNFINISHED, FINISHED])

    expect(hasCompletedStudy(metadata, 7, "p1")).toBe(true)
    expect(findStudyResultByPseudonym(metadata, 7, "p1")).toEqual({ endDate: 5000 })
  })
})
