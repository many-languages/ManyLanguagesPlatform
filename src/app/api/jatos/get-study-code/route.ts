/**
 * JATOS API Route: Get Study Code
 *
 * Gets an available study code from JATOS for a specific study and worker type.
 * Uses fetchStudyCodes (POST /jatos/api/v1/studies/{id}/studyCodes).
 *
 * @route GET /api/jatos/get-study-code
 * @queryParams studyId (JATOS study ID), type (worker type, default: "gs")
 * @returns Available study code
 */
import { NextResponse } from "next/server"
import { fetchStudyCodes, FetchStudyCodesError } from "@/src/lib/jatos/api/fetchStudyCodes"
import { getServiceAccountToken } from "@/src/lib/jatos/serviceAccount"
import type { GetStudyCodeResponse, JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  req: Request
): Promise<NextResponse<GetStudyCodeResponse | JatosApiError>> {
  try {
    const { searchParams } = new URL(req.url)
    const studyId = searchParams.get("studyId")
    const type = (searchParams.get("type") ?? "gs") as "gs" | "gm"

    if (!studyId) {
      const errorResponse: JatosApiError = { error: "Missing studyId" }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const token = await getServiceAccountToken()
    const codes = await fetchStudyCodes({ studyId, type, amount: 1 }, { token })

    if (codes.length === 0) {
      const errorResponse: JatosApiError = { error: "No study code found" }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    const successResponse: GetStudyCodeResponse = {
      studyId,
      type,
      code: codes[0],
    }
    return NextResponse.json(successResponse)
  } catch (err) {
    if (err instanceof FetchStudyCodesError) {
      const errorResponse: JatosApiError = { error: err.message }
      return NextResponse.json(errorResponse, { status: err.status })
    }
    console.error("Error fetching JATOS study code:", err)
    const errorResponse: JatosApiError = {
      error: err instanceof Error ? err.message : "Unexpected error",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
