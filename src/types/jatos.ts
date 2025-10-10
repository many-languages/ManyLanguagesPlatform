export interface JatosFileInfo {
  filename: string
  size: number
  sizeHumanReadable: string
}

export interface JatosDataInfo {
  size: number
  sizeHumanReadable: string
}

export interface JatosComponentResult {
  id: number
  componentId: number
  componentUuid: string
  startDate: number
  endDate: number
  duration: string
  componentState: string // STARTED | DATA_RETRIEVED | FINISHED | RELOADED | ABORTED | FAIL
  path: string
  data: JatosDataInfo
  files: JatosFileInfo[]
}

export interface JatosStudyResult {
  id: number
  uuid: string
  studyCode: string
  comment?: string // from personal link, optional
  startDate: number
  endDate: number
  duration: string
  lastSeenDate: number
  studyState: string // PRE | STARTED | DATA_RETRIEVED | FINISHED | ABORTED | FAIL
  message?: string
  workerId: number
  workerType:
    | "GeneralMultiple"
    | "GeneralSingle"
    | "Jatos"
    | "MTSandbox"
    | "MT"
    | "PersonalMultiple"
    | "PersonalSingle"
  batchId: number
  batchUuid: string
  batchTitle: string
  groupId?: string | null
  componentResults: JatosComponentResult[]
}

export interface JatosMetadataStudy {
  studyId: number
  studyUuid: string
  studyTitle: string
  studyResults: JatosStudyResult[]
}

export interface JatosMetadata {
  apiVersion?: string
  data: JatosMetadataStudy[]
}

// Extended version of JatosComponentResult with actual data fields
export interface EnrichedJatosComponentResult extends JatosComponentResult {
  dataContent: string | null
  parsedData?: any
}

// Extended version of JatosStudyResult that uses the enriched components
export interface EnrichedJatosStudyResult extends JatosStudyResult {
  componentResults: EnrichedJatosComponentResult[]
}

export interface JatosBatch {
  id: number
  uuid: string
  title: string
  active: boolean
  allowedWorkerTypes?: (
    | "GeneralSingle"
    | "GeneralMultiple"
    | "PersonalSingle"
    | "PersonalMultiple"
    | "MT"
    | "MTSandbox"
    | "Jatos"
  )[]
  comments?: string | null
  jsonData?: string | null
  maxActiveMembers?: number | null
  maxTotalMembers?: number | null
  maxTotalWorkers?: number | null
}

export interface JatosComponent {
  id: number
  uuid: string
  title: string
  htmlFilePath: string
  position: number
  comments?: string
  active?: boolean
  reloadable?: boolean
  jsonData?: string | null
}

export interface JatosMember {
  username: string
}

/**
 * Represents the result of GET /jatos/api/v1/studies/{id}
 * This corresponds to "JATOS study properties".
 */
export interface JatosStudyProperties {
  id: number
  uuid: string
  title: string
  dirName: string
  comments?: string | null
  active: boolean
  locked: boolean
  groupStudy: boolean
  linearStudy: boolean
  allowPreview: boolean
  descriptionHash?: string | null
  studyEntryMsg?: string | null
  endRedirectUrl?: string | null
  jsonData?: string | null

  components?: JatosComponent[]
  batches?: JatosBatch[]
  members?: JatosMember[]

  // legacy or null placeholders
  componentList?: any | null
  batchList?: any | null
}
