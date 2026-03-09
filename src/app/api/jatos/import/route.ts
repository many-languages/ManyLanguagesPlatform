/**
 * JATOS API Route: Import Study
 *
 * Imports a JATOS study file (.jzip) to the JATOS server.
 * Uses POST /jatos/api/v1/studies (new API with ApiEnvelopeStudy response).
 * 200 = study overwritten, 201 = study created.
 *
 * @route POST /api/jatos/import
 * @body FormData with "studyFile" field (File)
 * @returns JATOS study ID, UUID, filename; studyExists derived from HTTP status
 */
import { NextResponse } from "next/server"
import { createHash } from "crypto"
import JSZip from "jszip"
import type { JatosImportResponse, JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Increase max file size (default is 4.5MB, increase to 100MB for JATOS files)
export const maxDuration = 60 // 60 seconds timeout

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

async function computeBuildHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const entries = Object.entries(zip.files)
    .filter(([, entry]) => !entry.dir)
    .sort(([a], [b]) => a.localeCompare(b))

  const hash = createHash("sha256")

  for (const [filename, entry] of entries) {
    hash.update(filename)
    hash.update("\0")
    const content = await entry.async("uint8array")
    hash.update(content)
    hash.update("\0")
  }

  return hash.digest("hex")
}

export async function POST(
  req: Request
): Promise<NextResponse<JatosImportResponse | JatosApiError>> {
  try {
    const form = await req.formData()
    const file = form.get("studyFile") as File | null

    if (!file) {
      const errorResponse: JatosApiError = { error: "Missing studyFile" }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    if (!file.name.endsWith(".jzip")) {
      const errorResponse: JatosApiError = { error: "Expected a .jzip file" }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Check file size (100MB limit)
    const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
    if (file.size > MAX_FILE_SIZE) {
      const errorResponse: JatosApiError = {
        error: `File too large. Maximum size is 100MB, got ${(file.size / 1024 / 1024).toFixed(
          2
        )}MB`,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    let buildHash: string
    try {
      buildHash = await computeBuildHash(file)
    } catch (error) {
      console.error("Failed to hash JATOS study file:", error)
      const errorResponse: JatosApiError = { error: "Failed to read JATOS .jzip archive" }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Forward to JATOS (POST /jatos/api/v1/studies - new API)
    const out = new FormData()
    out.append("study", file, file.name)

    const jatosUrl = `${JATOS_BASE}/jatos/api/v1/studies`
    const res = await fetch(jatosUrl, {
      method: "POST",
      headers: { accept: "application/json", Authorization: `Bearer ${JATOS_TOKEN}` },
      body: out,
    })

    const text = await res.text()

    if (!res.ok) {
      const errorResponse: JatosApiError = { error: text }
      return NextResponse.json(errorResponse, { status: res.status })
    }

    // New API returns ApiEnvelopeStudy: { apiVersion, data: Study }
    const json = JSON.parse(text) as {
      data?: { id?: number; uuid?: string; title?: string }
    }
    const data = json.data

    if (!data?.uuid || data.id == null) {
      const errorResponse: JatosApiError = {
        error: "Missing id or uuid in JATOS response",
      }
      return NextResponse.json(errorResponse, { status: 502 })
    }

    // 200 = study overwritten (existed), 201 = study created (new)
    const studyExists = res.status === 200

    const successResponse: JatosImportResponse = {
      jatosStudyId: data.id,
      jatosStudyUUID: data.uuid,
      jatosFileName: file.name,
      buildHash,
      hashAlgorithm: "sha256",
      studyExists,
      uploadedStudyTitle: data.title,
    }
    return NextResponse.json(successResponse)
  } catch (error: any) {
    console.error("Error importing JATOS study:", error)
    const errorResponse: JatosApiError = {
      error: error.message || "Failed to import study",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
