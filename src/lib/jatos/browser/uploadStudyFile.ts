/**
 * Browser-side helper for uploading JATOS study files.
 *
 * Posts FormData to POST /api/jatos/import (sole JATOS API route exception).
 * The route handles JATOS upload + DB updates + membership sync.
 *
 * Failures are thrown as {@link JatosImportRouteError} with a `kind` discriminant:
 * - `ingress` — request validation (file, studyId, worker type)
 * - `auth` — not logged in
 * - `jatos` — JATOS/transport/DB (message already user-safe from server)
 * - `conflict` — duplicate UUID in DB
 *
 * @example
 * ```ts
 * const result = await uploadStudyFile(file, { studyId, jatosWorkerType })
 * ```
 */

import {
  JatosImportRouteError,
  parseJatosImportRouteErrorJson,
} from "@/src/lib/jatos/import/importRouteResponse"
import type { JatosImportResponse } from "@/src/types/jatos-api"

export type {
  JatosImportRouteError,
  JatosImportRouteErrorKind,
} from "@/src/lib/jatos/import/importRouteResponse"
export { messageForJatosImportFailure } from "@/src/lib/jatos/import/importRouteResponse"

export interface UploadStudyFileOptions {
  studyId: number
  jatosWorkerType: "SINGLE" | "MULTIPLE"
}

/**
 * Uploads a JATOS study file (.jzip) via the import route.
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

  const data: unknown = await res.json()

  if (!res.ok) {
    throw parseJatosImportRouteErrorJson(data, res.status)
  }

  const success = data as JatosImportResponse & { latestUpload?: { id: number } }
  return {
    jatosStudyId: success.jatosStudyId,
    jatosStudyUUID: success.jatosStudyUUID,
    jatosFileName: success.jatosFileName,
    buildHash: success.buildHash,
    hashAlgorithm: success.hashAlgorithm,
    studyExists: success.studyExists,
    currentStudyTitle: success.currentStudyTitle,
    uploadedStudyTitle: success.uploadedStudyTitle,
    latestUpload: success.latestUpload,
  }
}
