/**
 * JATOS API Route: Get Study Code
 *
 * Gets an available study code from JATOS for a specific study and worker type.
 *
 * @route GET /api/jatos/get-study-code
 * @queryParams studyId (JATOS study ID), type (worker type, default: "gs")
 * @returns Available study code with metadata
 */
import { NextResponse } from "next/server"
import type { GetStudyCodeResponse, JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export async function GET(
  req: Request
): Promise<NextResponse<GetStudyCodeResponse | JatosApiError>> {
  try {
    const { searchParams } = new URL(req.url)
    const studyId = searchParams.get("studyId")
    const type = searchParams.get("type") ?? "gs" // default to GeneralSingle

    if (!studyId) {
      const errorResponse: JatosApiError = { error: "Missing studyId" }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // 🔹 Request study codes from JATOS
    const res = await fetch(
      `${JATOS_BASE}/jatos/api/v1/studies/${studyId}/studyCodes?type=${type}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${JATOS_TOKEN}`,
        },
      }
    )

    const json = await res.json()
    if (!res.ok) {
      const errorResponse: JatosApiError = { error: String(json) }
      return NextResponse.json(errorResponse, { status: res.status })
    }

    // Extract the first available code (usually only one for general types)
    const studyCode = json?.[0]?.code ?? null
    if (!studyCode) {
      const errorResponse: JatosApiError = { error: "No study code found" }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    const successResponse: GetStudyCodeResponse = {
      studyId,
      type,
      code: studyCode,
      codeType: json[0]?.codeType,
      batchId: json[0]?.batchId,
    }
    return NextResponse.json(successResponse)
  } catch (err: any) {
    console.error("Error fetching JATOS study code:", err)
    const errorResponse: JatosApiError = {
      error: err.message ?? "Unexpected error",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
