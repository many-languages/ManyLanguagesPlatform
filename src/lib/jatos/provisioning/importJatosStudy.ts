/**
 * Import JATOS study for a researcher.
 * Uploads to JATOS, updates DB, syncs membership.
 * Called by POST /api/jatos/import route.
 */

import { createHash } from "crypto"
import JSZip from "jszip"
import db from "db"
import { getAdminToken } from "../getAdminToken"
import { uploadStudy } from "../client/uploadStudy"
import { addStudyMember } from "../client/addStudyMember"
import { ensureResearcherJatosMember } from "./ensureResearcherJatosMember"
import { getServiceAccountJatosUserId } from "../serviceAccount"
import { deriveStep1Completed, verifyResearcherStudyAccess } from "@/src/features/studies"

export interface ImportJatosStudyResult {
  jatosStudyId: number
  jatosStudyUUID: string
  jatosFileName: string
  buildHash: string
  hashAlgorithm: string
  studyExists: boolean
  uploadedStudyTitle?: string
  latestUpload: { id: number }
}

async function computeBuildHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()

  // Magic bytes check (PK\x03\x04)
  if (arrayBuffer.byteLength < 4) {
    throw new Error("Invalid file format: too small to be a ZIP archive")
  }
  const view = new Uint8Array(arrayBuffer, 0, 4)
  if (view[0] !== 0x50 || view[1] !== 0x4b || view[2] !== 0x03 || view[3] !== 0x04) {
    throw new Error("Invalid file format: not a valid ZIP archive")
  }

  const zip = await JSZip.loadAsync(arrayBuffer)

  const MAX_FILES = 10000
  const MAX_DECOMPRESSED_SIZE = 500 * 1024 * 1024 // 500 MB

  let fileCount = 0
  let decompressedSize = 0

  const entries = Object.entries(zip.files)
    .filter(([, entry]) => !entry.dir)
    .sort(([a], [b]) => a.localeCompare(b))

  const hash = createHash("sha256")
  for (const [filename, entry] of entries) {
    fileCount++
    if (fileCount > MAX_FILES) {
      throw new Error(`Zip bomb detected: exceeds maximum allowed files (${MAX_FILES})`)
    }

    hash.update(filename)
    hash.update("\0")

    const content = await entry.async("uint8array")

    decompressedSize += content.byteLength
    if (decompressedSize > MAX_DECOMPRESSED_SIZE) {
      throw new Error(`Zip bomb detected: decompressed size exceeds maximum allowed (500 MB)`)
    }

    hash.update(content)
    hash.update("\0")
  }
  return hash.digest("hex")
}

/**
 * Imports a JATOS study for a researcher.
 * 1. Validates researcher access
 * 2. Computes build hash
 * 3. Uploads to JATOS
 * 4. Updates DB (Study, JatosStudyUpload)
 * 5. Syncs researcher membership and service account
 */
export async function importJatosStudyForResearcher({
  file,
  studyId,
  userId,
  jatosWorkerType,
}: {
  file: File
  studyId: number
  userId: number
  jatosWorkerType: "SINGLE" | "MULTIPLE"
}): Promise<ImportJatosStudyResult> {
  await verifyResearcherStudyAccess(studyId, userId)

  const buildHash = await computeBuildHash(file)
  const token = getAdminToken()

  const jatosResult = await uploadStudy(file, { token })
  const jatosStudyId = jatosResult.id
  const jatosStudyUUID = jatosResult.uuid
  const studyExists = true // We don't have HTTP status here; assume overwrite semantics

  const result = await db.$transaction(async (tx) => {
    const studyInfo = await tx.study.findUnique({
      where: { id: studyId },
      select: { title: true, description: true },
    })
    if (!studyInfo) throw new Error("Study not found")

    const step1Completed = deriveStep1Completed(studyInfo)

    await tx.study.update({
      where: { id: studyId },
      data: { jatosStudyUUID },
    })

    const existingUpload = await tx.jatosStudyUpload.findUnique({
      where: { studyId_buildHash: { studyId, buildHash } },
      select: { id: true },
    })

    let upload
    if (existingUpload) {
      upload = await tx.jatosStudyUpload.update({
        where: { id: existingUpload.id },
        data: {
          jatosStudyId,
          jatosFileName: file.name,
          jatosWorkerType,
          step1Completed,
        },
        select: { id: true },
      })
    } else {
      const latestUpload = await tx.jatosStudyUpload.findFirst({
        where: { studyId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      })
      const versionNumber = (latestUpload?.versionNumber ?? 0) + 1

      upload = await tx.jatosStudyUpload.create({
        data: {
          studyId,
          versionNumber,
          jatosStudyId,
          jatosFileName: file.name,
          jatosWorkerType,
          buildHash,
          hashAlgorithm: "sha256",
          step1Completed,
        },
        select: { id: true },
      })
    }
    return upload
  })

  const researchers = await db.studyResearcher.findMany({
    where: { studyId },
    select: { userId: true },
  })
  await Promise.all(researchers.map((r) => ensureResearcherJatosMember(r.userId, jatosStudyId)))

  const jatosUserId = await getServiceAccountJatosUserId()
  if (jatosUserId != null) {
    await addStudyMember({ studyId: jatosStudyId, userId: jatosUserId }, { token })
  }

  return {
    jatosStudyId,
    jatosStudyUUID,
    jatosFileName: file.name,
    buildHash,
    hashAlgorithm: "sha256",
    studyExists,
    uploadedStudyTitle: jatosResult.title,
    latestUpload: { id: result.id },
  }
}
