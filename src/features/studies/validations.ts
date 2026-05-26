import { JatosWorkerType } from "@/db"
import { jatosRunUrlSchema } from "@/src/lib/jatos/utils/jatosRunUrlSchema"
import {
  JATOS_IMPORT_MAX_FILE_SIZE,
  parseImportStudyFileFromFormData,
} from "@/src/features/studies/domain/jatos/parseImportStudyFile"
import { z } from "zod"

export { JATOS_IMPORT_MAX_FILE_SIZE }

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

/** POST /api/jatos/import — studyId + worker type (file parsed separately for clear errors). */
export const JatosImportRouteFieldsSchema = z.object({
  studyId: z.coerce.number().pipe(Id),
  jatosWorkerType: z.nativeEnum(JatosWorkerType),
})

export type JatosImportRouteInput = z.infer<typeof JatosImportRouteFieldsSchema> & {
  studyFile: File
}

export function parseJatosImportFormData(
  form: FormData
): { success: true; data: JatosImportRouteInput } | { success: false; error: string } {
  const fileParsed = parseImportStudyFileFromFormData(form.get("studyFile"))
  if (!fileParsed.success) {
    return { success: false, error: fileParsed.error }
  }

  const fieldsParsed = JatosImportRouteFieldsSchema.safeParse({
    studyId: form.get("studyId"),
    jatosWorkerType: form.get("jatosWorkerType"),
  })
  if (!fieldsParsed.success) {
    const issue = fieldsParsed.error.issues[0]
    const field = issue?.path[0]
    if (field === "studyId") {
      return { success: false, error: "Invalid or missing studyId." }
    }
    if (field === "jatosWorkerType") {
      return { success: false, error: "Missing or invalid jatosWorkerType (SINGLE or MULTIPLE)." }
    }
    return { success: false, error: issue?.message ?? "Invalid request" }
  }

  return {
    success: true,
    data: { ...fieldsParsed.data, studyFile: fileParsed.file },
  }
}

const validateStudyDateRange = (
  data: { startDate: string; endDate: string },
  ctx: z.RefinementCtx
) => {
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return
  }
  if (end < start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be on or after start date",
      path: ["endDate"],
    })
  }
}

const StudyInformationFormFields = z.object({
  title: z.string().min(1, "Title is required").trim(),
  description: z.string().min(1, "Description is required").trim(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  sampleSize: z.coerce.number().int().positive("Must be a positive number"),
  payment: z.string().min(1, "Payment description is required").trim(),
  length: z.string().min(1, "Study length is required").trim(),
})

export const StudyInformationFormSchema =
  StudyInformationFormFields.superRefine(validateStudyDateRange)

export const CreateStudy = z.object({
  // Bare minimum for creating a new study draft record
  title: z.string().default("Untitled study"),
  description: z.string().default(""),
  startDate: z.date().default(() => new Date()),
  endDate: z.date().default(() => new Date()),
  sampleSize: z.number().default(0),
  payment: z.string().default(""),
  length: z.string().default(""),
})

export type CreateStudyInput = z.infer<typeof CreateStudy>

export const UpdateStudy = StudyInformationFormFields.extend({
  id: Id,
  status: z.enum(["OPEN", "CLOSED"]).optional(),
}).superRefine(validateStudyDateRange)
export type UpdateStudyInput = z.infer<typeof UpdateStudy>

export const ArchiveStudy = z.object({ id: Id })

export const UnarchiveStudy = z.object({ id: Id })

export const DeleteStudy = z.object({ id: Id })

// Mutation validations
export const JoinStudy = z.object({
  studyId: Id,
})

export const UpdateStudyBatch = z.object({
  studyId: Id,
  jatosBatchId: z.number(),
})

export const UpdateJatosUploadWorkerType = z.object({
  studyId: Id,
  jatosWorkerType: z.nativeEnum(JatosWorkerType),
})

export const UpdateStudyStatus = z.object({
  studyId: Id,
  status: z.enum(["OPEN", "CLOSED"]),
})

// Query validations
export const GetStudyParticipants = z.object({
  studyId: Id,
})

export const IsParticipantInStudy = z.object({
  studyId: Id,
})

export const GetStudyParticipant = z.object({
  studyId: Id,
})

export const GetStudyResearcher = z.object({
  studyId: Id,
})

export const ToggleParticipantActive = z.object({
  participantIds: z.array(Id),
  makeActive: z.boolean(),
})

export const ToggleParticipantPayed = z.object({
  participantIds: z.array(Id),
  makePayed: z.boolean(),
})

// GetStudies uses Prisma types, but we can create a partial validation for common cases
export const GetStudiesInput = z
  .object({
    skip: z.number().int().nonnegative().optional(),
    take: z.number().int().positive().max(100).optional().default(100),
    // where, orderBy, include are too complex to validate with Zod
    // They're validated by Prisma at runtime
  })
  .passthrough() // Allow additional Prisma args

/** Admin bulk actions on the studies table */
export const AdminStudySchema = z.object({
  selectedStudyIds: z.array(z.number()).min(1, "Select at least one study"),
})

export type AdminStudyFormValues = z.infer<typeof AdminStudySchema>

/** Step 2 import orchestration after JATOS file upload. */
export const CompleteStep2ImportSchema = z.object({
  studyId: Id,
  jatosStudyId: z.number().int().positive(),
  jatosStudyUUID: z.string().min(1),
  latestUploadId: z.number().int().positive().nullable(),
})

export type CompleteStep2ImportInput = z.infer<typeof CompleteStep2ImportSchema>

/** Participant join flow: create personal study code and persist run URL. */
export const CreateParticipantStudyCodeActionSchema = z.object({
  studyId: Id,
  jatosStudyId: z.number().int().positive(),
  jatosBatchId: z.number().int().positive().optional(),
  type: z.enum(["ps", "pm"]),
  comment: z.string().min(1).max(255),
  participantStudyId: Id,
})

export type CreateParticipantStudyCodeActionInput = z.infer<
  typeof CreateParticipantStudyCodeActionSchema
>

/** Admin bulk study lifecycle mutations */
export const ApproveStudySchema = z.object({
  studyIds: z.array(Id).min(1, "Select at least one study"),
})

export const RejectStudySchema = z.object({
  studyIds: z.array(Id).min(1, "Select at least one study"),
})

export const AdminDeleteStudiesSchema = z.object({
  studyIds: z.array(Id).min(1, "Select at least one study"),
  reason: z.string().min(1, "Reason is required"),
})

export const EnableDataCollectionSchema = z.object({
  studyIds: z.array(Id).min(1, "Select at least one study"),
})

export const DisableDataCollectionSchema = z.object({
  studyIds: z.array(Id).min(1, "Select at least one study"),
})

/** Researcher setup and extraction mutations */
export const ApproveExtractionSchema = z.object({
  studyId: Id,
})

export const RunExtractionSchema = z.object({
  studyId: Id,
  includeDiagnostics: z.boolean().optional().default(true),
})

export const SaveParticipantRunUrlSchema = z.object({
  participantStudyId: Id,
  jatosRunUrl: jatosRunUrlSchema,
})

export const CreateResearcherPilotLinkSchema = z.object({
  studyId: Id,
  studyResearcherId: Id,
  jatosStudyUploadId: Id,
  jatosRunUrl: jatosRunUrlSchema,
  markerToken: z.string(),
})

export const CheckJatosStudyUuidSchema = z.object({
  studyId: Id,
  jatosStudyUUID: z.string().min(1),
  mode: z.enum(["create", "update"]),
})

export const CheckPilotStatusActionSchema = z.object({
  studyId: Id,
  jatosStudyUUID: z.string().min(1).nullable(),
  jatosStudyUploadId: Id.nullable(),
})

export type ApproveStudyInput = z.infer<typeof ApproveStudySchema>
export type RejectStudyInput = z.infer<typeof RejectStudySchema>
export type AdminDeleteStudiesInput = z.infer<typeof AdminDeleteStudiesSchema>
export type EnableDataCollectionInput = z.infer<typeof EnableDataCollectionSchema>
export type DisableDataCollectionInput = z.infer<typeof DisableDataCollectionSchema>
export type ApproveExtractionInput = z.infer<typeof ApproveExtractionSchema>
export type RunExtractionInput = z.infer<typeof RunExtractionSchema>
export type SaveParticipantRunUrlInput = z.infer<typeof SaveParticipantRunUrlSchema>
export type CreateResearcherPilotLinkInput = z.infer<typeof CreateResearcherPilotLinkSchema>
export type CheckJatosStudyUuidInput = z.infer<typeof CheckJatosStudyUuidSchema>
export type CheckPilotStatusActionInput = z.infer<typeof CheckPilotStatusActionSchema>
