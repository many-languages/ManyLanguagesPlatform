/**
 * JATOS API Route: Import Study
 *
 * Imports a JATOS study file (.jzip) to the JATOS server.
 *
 * @route POST /api/jatos/import
 * @body FormData with "studyFile" field (File)
 * @returns JATOS study ID, UUID, and filename
 * @returns 409 if study already exists with conflict details
 */
import { NextResponse } from "next/server"
import type {
  JatosImportResponse,
  JatosImportConflictResponse,
  JatosApiError,
} from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export async function POST(
  req: Request
): Promise<NextResponse<JatosImportResponse | JatosImportConflictResponse | JatosApiError>> {
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

    // Forward to JATOS
    const out = new FormData()
    out.append("study", file, file.name)
    const res = await fetch(`${JATOS_BASE}/jatos/api/v1/study`, {
      method: "POST",
      headers: { accept: "application/json", Authorization: `Bearer ${JATOS_TOKEN}` },
      body: out,
    })

    const text = await res.text()

    if (!res.ok) {
      const errorResponse: JatosApiError = { error: text }
      return NextResponse.json(errorResponse, { status: res.status })
    }

    const json = JSON.parse(text) as {
      id: number
      uuid?: string
      studyExists?: boolean
      currentStudyTitle?: string
      uploadedStudyTitle?: string
      uploadedDirExists?: boolean
    }

    if (!json.uuid) {
      const errorResponse: JatosApiError = { error: "Missing uuid in JATOS response" }
      return NextResponse.json(errorResponse, { status: 502 })
    }

    // Check if study already exists on JATOS
    if (json.studyExists) {
      const conflictResponse: JatosImportConflictResponse = {
        error: "Study already exists on JATOS server",
        studyExists: true,
        jatosStudyId: json.id,
        jatosStudyUUID: json.uuid,
        jatosFileName: file.name,
        currentStudyTitle: json.currentStudyTitle,
        uploadedStudyTitle: json.uploadedStudyTitle,
      }
      return NextResponse.json(conflictResponse, { status: 409 })
    }

    // Normal success response
    const successResponse: JatosImportResponse = {
      jatosStudyId: json.id,
      jatosStudyUUID: json.uuid,
      jatosFileName: file.name,
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
