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
