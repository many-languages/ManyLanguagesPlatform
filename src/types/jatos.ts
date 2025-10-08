export interface JatosComponentResult {
  id: number
  componentId: number
  duration: string
  data?: { size: number; sizeHumanReadable: string }
  startDate?: number
  endDate?: number
  componentState?: string
}

export interface JatosStudyResult {
  id: number
  studyState: string
  lastSeenDate?: number
  duration: string
  componentResults: JatosComponentResult[]
}

export interface JatosMetadataStudy {
  studyId: number
  studyTitle: string
  studyResults: JatosStudyResult[]
}

export interface JatosMetadata {
  data: JatosMetadataStudy[]
}
