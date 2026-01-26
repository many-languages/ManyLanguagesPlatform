/**
 * TypeScript types for JATOS API route responses
 * These types define the structure of responses from our API routes
 */

/**
 * Standard error response structure for all JATOS API routes
 */
export interface JatosApiError {
  error: string
  details?: string | unknown
}

/**
 * Response from /api/jatos/import
 */
export interface JatosImportResponse {
  jatosStudyId: number
  jatosStudyUUID: string
  jatosFileName: string
  buildHash: string
  hashAlgorithm: string
  studyExists?: boolean
  currentStudyTitle?: string
  uploadedStudyTitle?: string
}

/**
 * Response from /api/jatos/import when study exists (409)
 */
export interface JatosImportConflictResponse extends JatosApiError {
  studyExists: true
  jatosStudyId: number
  jatosStudyUUID: string
  jatosFileName: string
  currentStudyTitle?: string
  uploadedStudyTitle?: string
}

/**
 * Response from /api/jatos/create-personal-studycode
 */
export interface CreatePersonalStudyCodeResponse {
  code: string
}

/**
 * Response from /api/jatos/create-component
 */
export interface CreateComponentResponse {
  jatosComponentId: number
  jatosComponentUUID: string
}

/**
 * Response from /api/jatos/get-study-code
 */
export interface GetStudyCodeResponse {
  studyId: string
  type: string
  code: string
  codeType?: string
  batchId?: number
}

/**
 * Response from /api/jatos/create-personal-links
 */
export interface CreatePersonalLinksResponse {
  studyId: number
  type: string
  amount: number
  codes: Array<{
    id: number
    code: string
    codeType: string
    batchId: number
    active: boolean
  }>
}

/**
 * Response from /api/jatos/get-results-metadata
 */
export type GetResultsMetadataResponse = Array<{
  id: number
  studyId: number
  componentResults: Array<{
    componentId: number
    componentUuid: string
    dataContent: string | null
  }>
  comment: string | null
}>
