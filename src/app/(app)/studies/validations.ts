import { JatosWorkerType } from "@/db"
import { z } from "zod"

export const Id = z.number().int().positive()
export type IdInput = z.infer<typeof Id>

export const GetStudy = z.object({
  id: Id,
})

// Base object — no .refine() yet
const BaseJatosFormSchema = z.object({
  jatosWorkerType: z.nativeEnum(JatosWorkerType).default(JatosWorkerType.SINGLE),
  studyFile: z
    .any()
    .refine((f) => f == null || (typeof File !== "undefined" && f instanceof File), {
      message: "Must be a valid file",
    })
    .optional(),
  jatosFileName: z.string().optional(),
})

// The actual form schema with refinement logic
export const JatosFormSchema = BaseJatosFormSchema.refine(
  (data) => data.studyFile instanceof File || !!data.jatosFileName,
  {
    message: "Please upload a JATOS .jzip file (or keep the existing one).",
    path: ["studyFile"],
  }
)

// Use the base schema for extension (avoids .refine() issue)
export const ImportJatosSchema = BaseJatosFormSchema.extend({
  studyId: Id,
  jatosStudyId: z.number(),
  jatosStudyUUID: z.string(),
  jatosFileName: z.string(),
})

export const StudyFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  sampleSize: z.number().int().positive("Must be a positive number"),
  payment: z.string().min(1, "Payment description is required"),
  ethicalPermission: z.string().url("Must be a valid URL"),
  length: z.string().min(1, "Study length is required"),
})

export const CreateStudy = z.object({
  // Bare minimum for creating a new study draft record
  title: z.string().default("Untitled study"),
  description: z.string().default(""),
  startDate: z.date().default(() => new Date()),
  endDate: z.date().default(() => new Date()),
  sampleSize: z.number().default(0),
  payment: z.string().default(""),
  ethicalPermission: z.string().default("https://example.com"),
  length: z.string().default(""),
})

export type CreateStudyInput = z.infer<typeof CreateStudy>

export const UpdateStudy = StudyFormSchema.extend({
  id: Id,
  status: z.enum(["OPEN", "CLOSED"]).optional(),
})
export type UpdateStudyInput = z.infer<typeof UpdateStudy>

export const ArchiveStudy = z.object({ id: z.number().int().positive() })

export const UnarchiveStudy = z.object({ id: z.number().int().positive() })

export const StudyComponentFormSchema = z.object({
  htmlFilePath: z.string().min(1, "Please select an HTML file"),
})

export const UpdateStudyComponent = z.object({
  id: z.number(),
  jatosComponentId: z.number(),
  jatosComponentUUID: z.string().optional(),
})
