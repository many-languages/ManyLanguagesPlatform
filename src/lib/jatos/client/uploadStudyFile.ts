/**
 * Client-side helper for uploading JATOS study files.
 *
 * Posts FormData to POST /api/jatos/import (sole JATOS API route exception).
 * The route handles JATOS upload + DB updates + membership sync.
 *
 * @example
 * ```ts
 * const result = await uploadStudyFile(file, { studyId, jatosWorkerType })
 * // result includes jatosStudyId, jatosStudyUUID, latestUpload, etc.
 * ```
 */

import type { JatosImportResponse } from "@/src/types/jatos-api"

export interface UploadStudyFileOptions {
  studyId: number
  jatosWorkerType: "SINGLE" | "MULTIPLE"
}

/**
 * Uploads a JATOS study file (.jzip) via the import route.
 * Route performs full import: JATOS upload + DB + membership sync.
 *
 * @param file - The .jzip file to upload
 * @param options - studyId and jatosWorkerType (required by route)
 * @returns Import result with study IDs and latestUpload
 * @throws Error if upload fails
 */
export async function uploadStudyFile(
  file: File,
  options: UploadStudyFileOptions
): Promise<JatosImportResponse & { latestUpload?: { id: number } }> {
  const { studyId, jatosWorkerType } = options
  const fd = new FormData()
  fd.append("studyFile", file, file.name)
  fd.append("studyId", String(studyId))
  fd.append("jatosWorkerType", jatosWorkerType)

  const res = await fetch("/api/jatos/import", {
    method: "POST",
    body: fd,
  })

  const data = await res.json()

  if (!res.ok) {
    const error = data as { error?: string }
    throw new Error(error.error || `Upload failed: ${res.status}`)
  }

  return {
    jatosStudyId: data.jatosStudyId,
    jatosStudyUUID: data.jatosStudyUUID,
    jatosFileName: data.jatosFileName,
    buildHash: data.buildHash,
    hashAlgorithm: data.hashAlgorithm,
    studyExists: data.studyExists,
    currentStudyTitle: data.currentStudyTitle,
    uploadedStudyTitle: data.uploadedStudyTitle,
    latestUpload: data.latestUpload,
  }
}
