/**
 * JATOS API Route: Create Personal Study Code
 *
 * Creates a single personal study code (PersonalSingle or PersonalMultiple) with optional comment.
 * Used for generating individual participant links.
 * Uses fetchStudyCodes (POST /jatos/api/v1/studies/{id}/studyCodes).
 *
 * @route POST /api/jatos/create-personal-studycode
 * @body { jatosStudyId: number, jatosBatchId?: number, type?: "ps" | "pm", comment?: string }
 * @returns Study code for generating run URL
 */
import { NextResponse } from "next/server"
import { fetchStudyCodes, FetchStudyCodesError } from "@/src/lib/jatos/api/fetchStudyCodes"
import type { CreatePersonalStudyCodeResponse, JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  req: Request
): Promise<NextResponse<CreatePersonalStudyCodeResponse | JatosApiError>> {
  try {
    const { jatosStudyId, jatosBatchId, type = "ps", comment } = await req.json()

    if (!jatosStudyId) {
      return NextResponse.json({ error: "Missing required field: jatosStudyId" }, { status: 400 })
    }

    const codes = await fetchStudyCodes({
      studyId: jatosStudyId,
      type: type as "ps" | "pm",
      amount: 1,
      batchId: jatosBatchId,
      comment,
    })

    if (codes.length === 0) {
      const errorResponse: JatosApiError = { error: "No study code found" }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    const successResponse: CreatePersonalStudyCodeResponse = { code: codes[0] }
    return NextResponse.json(successResponse)
  } catch (err) {
    if (err instanceof FetchStudyCodesError) {
      const errorResponse: JatosApiError = { error: err.message }
      return NextResponse.json(errorResponse, { status: err.status })
    }
    console.error("Error creating personal study code:", err)
    const errorResponse: JatosApiError = {
      error: err instanceof Error ? err.message : "Unexpected error",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
