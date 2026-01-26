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

import type { JatosImportResponse } from "@/src/types/jatos-api"

/**
 * Uploads a JATOS study file (.jzip) to the JATOS server.
 *
 * @param file - The .jzip file to upload
 * @returns Import result with study IDs
 * @throws Error if upload fails
 */
export async function uploadStudyFile(file: File): Promise<JatosImportResponse> {
  const fd = new FormData()
  fd.append("studyFile", file, file.name)

  const res = await fetch("/api/jatos/import", {
    method: "POST",
    body: fd,
  })

  const data = await res.json()

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
    buildHash: data.buildHash,
    hashAlgorithm: data.hashAlgorithm,
    studyExists: data.studyExists,
    currentStudyTitle: data.currentStudyTitle,
    uploadedStudyTitle: data.uploadedStudyTitle,
  } as JatosImportResponse
}
