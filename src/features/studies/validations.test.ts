import { JatosWorkerType } from "@/db"
import { describe, expect, it } from "vitest"
import {
  JatosImportRouteSchema,
  JATOS_IMPORT_MAX_FILE_SIZE,
  parseJatosImportFormData,
  StudyInformationFormSchema,
  UpdateStudy,
} from "./validations"

function mockJzipFile(name: string, size = 1): File {
  return new File([new ArrayBuffer(size)], name)
}

describe("JatosImportRouteSchema", () => {
  it("accepts valid import payload", () => {
    const result = JatosImportRouteSchema.safeParse({
      studyId: "42",
      jatosWorkerType: JatosWorkerType.SINGLE,
      studyFile: mockJzipFile("study.jzip"),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.studyId).toBe(42)
      expect(result.data.jatosWorkerType).toBe(JatosWorkerType.SINGLE)
    }
  })

  it("rejects missing file, invalid studyId, and bad worker type", () => {
    expect(
      JatosImportRouteSchema.safeParse({
        studyId: "42",
        jatosWorkerType: JatosWorkerType.MULTIPLE,
      }).success
    ).toBe(false)
    expect(
      JatosImportRouteSchema.safeParse({
        studyId: "abc",
        jatosWorkerType: JatosWorkerType.SINGLE,
        studyFile: mockJzipFile("study.jzip"),
      }).success
    ).toBe(false)
    expect(
      JatosImportRouteSchema.safeParse({
        studyId: "1",
        jatosWorkerType: "INVALID",
        studyFile: mockJzipFile("study.jzip"),
      }).success
    ).toBe(false)
  })

  it("rejects non-jzip extension and oversized files", () => {
    expect(
      JatosImportRouteSchema.safeParse({
        studyId: "1",
        jatosWorkerType: JatosWorkerType.SINGLE,
        studyFile: mockJzipFile("study.zip"),
      }).success
    ).toBe(false)
    expect(
      JatosImportRouteSchema.safeParse({
        studyId: "1",
        jatosWorkerType: JatosWorkerType.SINGLE,
        studyFile: mockJzipFile("big.jzip", JATOS_IMPORT_MAX_FILE_SIZE + 1),
      }).success
    ).toBe(false)
  })
})

describe("parseJatosImportFormData", () => {
  it("parses multipart fields from FormData", () => {
    const form = new FormData()
    form.append("studyFile", mockJzipFile("study.jzip"), "study.jzip")
    form.append("studyId", "7")
    form.append("jatosWorkerType", JatosWorkerType.MULTIPLE)

    const result = parseJatosImportFormData(form)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.studyId).toBe(7)
      expect(result.data.jatosWorkerType).toBe(JatosWorkerType.MULTIPLE)
      expect(result.data.studyFile.name).toBe("study.jzip")
    }
  })
})

describe("StudyInformationFormSchema date range", () => {
  const validFields = {
    title: "Study",
    description: "Description",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    sampleSize: 10,
    payment: "10 EUR",
    length: "30 min",
  }

  it("accepts end date on start date", () => {
    expect(
      StudyInformationFormSchema.safeParse({
        ...validFields,
        startDate: "2026-06-01",
        endDate: "2026-06-01",
      }).success
    ).toBe(true)
  })

  it("rejects end date before start date", () => {
    const result = StudyInformationFormSchema.safeParse({
      ...validFields,
      startDate: "2026-06-30",
      endDate: "2026-06-01",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors.some((e) => e.path.includes("endDate"))).toBe(true)
    }
  })
})

describe("UpdateStudy date range", () => {
  it("rejects end date before start date", () => {
    const result = UpdateStudy.safeParse({
      id: 1,
      title: "Study",
      description: "Description",
      startDate: "2026-12-01",
      endDate: "2026-01-01",
      sampleSize: 10,
      payment: "10 EUR",
      length: "30 min",
    })
    expect(result.success).toBe(false)
  })
})
