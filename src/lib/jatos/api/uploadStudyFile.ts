/**
 * Client-side helper for uploading JATOS study files.
 *
 * Handles file upload to JATOS with proper FormData handling and error processing.
 * Used from client components for study file uploads.
 *
 * @example
 * ```ts
 * import { uploadStudyFile } from "@/src/lib/jatos/api/uploadStudyFile"
 *
 * const result = await uploadStudyFile(file)
 * if (result.studyExists) {
 *   // Handle conflict
 * }
 * ```
 */

import type { JatosImportResponse, JatosImportConflictResponse } from "@/src/types/jatos-api"

/**
 * Uploads a JATOS study file (.jzip) to the JATOS server.
 *
 * @param file - The .jzip file to upload
 * @returns Import result with study IDs, or conflict response if study exists
 * @throws Error if upload fails (non-409 errors)
 */
export async function uploadStudyFile(
  file: File
): Promise<JatosImportResponse | JatosImportConflictResponse> {
  const fd = new FormData()
  fd.append("studyFile", file, file.name)

  const res = await fetch("/api/jatos/import", {
    method: "POST",
    body: fd,
  })

  const data = await res.json()

  // Handle existing study conflict (409)
  if (res.status === 409) {
    return {
      error: data.error,
      studyExists: true,
      jatosStudyId: data.jatosStudyId,
      jatosStudyUUID: data.jatosStudyUUID,
      jatosFileName: data.jatosFileName,
      currentStudyTitle: data.currentStudyTitle,
      uploadedStudyTitle: data.uploadedStudyTitle,
    } as JatosImportConflictResponse
  }

  // Handle other errors
  if (!res.ok) {
    const error = data as { error?: string }
    throw new Error(error.error || `Upload failed: ${res.status}`)
  }

  // Success response
  return {
    jatosStudyId: data.jatosStudyId,
    jatosStudyUUID: data.jatosStudyUUID,
    jatosFileName: data.jatosFileName,
  } as JatosImportResponse
}
