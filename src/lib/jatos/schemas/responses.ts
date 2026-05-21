import { z } from "zod"

const WorkerTypeSchema = z.enum([
  "GeneralMultiple",
  "GeneralSingle",
  "Jatos",
  "MTSandbox",
  "MT",
  "PersonalMultiple",
  "PersonalSingle",
])

const JatosFileInfoSchema = z
  .object({
    filename: z.string(),
    size: z.number(),
    sizeHumanReadable: z.string(),
  })
  .passthrough()

const JatosDataInfoSchema = z
  .object({
    size: z.number(),
    sizeHumanReadable: z.string(),
  })
  .passthrough()

export const JatosComponentResultSchema = z
  .object({
    id: z.number(),
    componentId: z.number(),
    componentUuid: z.string(),
    startDate: z.number(),
    endDate: z.number(),
    duration: z.string(),
    componentState: z.string(),
    path: z.string(),
    data: JatosDataInfoSchema,
    files: z.array(JatosFileInfoSchema),
  })
  .passthrough()

export const JatosStudyResultSchema = z
  .object({
    id: z.number(),
    uuid: z.string(),
    studyCode: z.string(),
    comment: z.string().optional(),
    startDate: z.number(),
    endDate: z.number(),
    duration: z.string(),
    lastSeenDate: z.number(),
    studyState: z.string(),
    message: z.string().optional(),
    workerId: z.number(),
    workerType: WorkerTypeSchema,
    batchId: z.number(),
    batchUuid: z.string(),
    batchTitle: z.string(),
    groupId: z.string().nullable().optional(),
    componentResults: z.array(JatosComponentResultSchema),
  })
  .passthrough()

export const JatosMetadataStudySchema = z
  .object({
    studyId: z.number(),
    studyUuid: z.string(),
    studyTitle: z.string(),
    studyResults: z.array(JatosStudyResultSchema),
  })
  .passthrough()

export const JatosMetadataSchema = z
  .object({
    apiVersion: z.string().optional(),
    data: z.array(JatosMetadataStudySchema),
  })
  .passthrough()

const JatosBatchSchema = z
  .object({
    id: z.number(),
    uuid: z.string(),
    title: z.string(),
    active: z.boolean(),
    allowedWorkerTypes: z.array(WorkerTypeSchema).optional(),
    comments: z.string().nullable().optional(),
    jsonData: z.string().nullable().optional(),
    maxActiveMembers: z.number().nullable().optional(),
    maxTotalMembers: z.number().nullable().optional(),
    maxTotalWorkers: z.number().nullable().optional(),
  })
  .passthrough()

const JatosComponentSchema = z
  .object({
    id: z.number(),
    uuid: z.string(),
    title: z.string(),
    htmlFilePath: z.string(),
    position: z.number().optional(),
    comments: z.string().optional(),
    active: z.boolean().optional(),
    reloadable: z.boolean().optional(),
    jsonData: z.string().nullable().optional(),
  })
  .passthrough()

const JatosMemberSchema = z
  .object({
    username: z.string(),
  })
  .passthrough()

export const JatosStudyPropertiesSchema = z
  .object({
    id: z.number(),
    uuid: z.string(),
    title: z.string(),
    dirName: z.string(),
    comments: z.string().nullable().optional(),
    active: z.boolean(),
    locked: z.boolean(),
    groupStudy: z.boolean(),
    linearStudy: z.boolean(),
    allowPreview: z.boolean(),
    descriptionHash: z.string().nullable().optional(),
    studyEntryMsg: z.string().nullable().optional(),
    endRedirectUrl: z.string().nullable().optional(),
    jsonData: z.string().nullable().optional(),
    components: z.array(JatosComponentSchema).optional(),
    batches: z.array(JatosBatchSchema).optional(),
    members: z.array(JatosMemberSchema).optional(),
    componentList: z.unknown().nullable().optional(),
    batchList: z.unknown().nullable().optional(),
  })
  .passthrough()

export const JatosStudyPropertiesEnvelopeSchema = z
  .object({
    apiVersion: z.string().optional(),
    data: JatosStudyPropertiesSchema,
  })
  .passthrough()

export const UploadStudyEnvelopeSchema = z
  .object({
    apiVersion: z.string().optional(),
    data: z
      .object({
        id: z.number(),
        uuid: z.string().min(1),
        title: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough()

export const StudyCodesEnvelopeSchema = z
  .object({
    apiVersion: z.string().optional(),
    data: z.array(z.string()),
  })
  .passthrough()

export const CreateJatosUserEnvelopeSchema = z
  .object({
    apiVersion: z.string().optional(),
    data: z
      .object({
        id: z.number(),
        username: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough()

export const CreateJatosUserTokenEnvelopeSchema = z
  .object({
    apiVersion: z.string().optional(),
    data: z
      .object({
        id: z.number(),
        token: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough()

type AssetNode = {
  type?: string
  name?: string
  path?: string
  content?: AssetNode[]
}

const AssetNodeSchema: z.ZodType<AssetNode> = z.lazy(() =>
  z
    .object({
      type: z.string().optional(),
      name: z.string().optional(),
      path: z.string().optional(),
      content: z.array(AssetNodeSchema).optional(),
    })
    .passthrough()
    .refine(
      (node) =>
        node.type !== undefined ||
        node.name !== undefined ||
        node.path !== undefined ||
        node.content !== undefined,
      "Asset node must include type, name, path, or content"
    )
)

export const AssetStructureResponseSchema = z.union([
  z
    .object({
      data: z.union([AssetNodeSchema, z.array(AssetNodeSchema)]).optional(),
    })
    .passthrough(),
  AssetNodeSchema,
])

export type JatosMetadataResponse = z.infer<typeof JatosMetadataSchema>
export type JatosStudyPropertiesEnvelope = z.infer<typeof JatosStudyPropertiesEnvelopeSchema>
