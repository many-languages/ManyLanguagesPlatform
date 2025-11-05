/**
 * JATOS API Route: Get Study Properties
 *
 * Fetches study properties from JATOS including components and batches.
 * This route wraps the server-side lib function for client-side usage.
 *
 * @route GET /api/jatos/get-study-properties
 * @queryParams studyId (JATOS study UUID)
 * @returns JATOS study properties
 */
import { NextResponse } from "next/server"
import { getStudyProperties } from "@/src/lib/jatos/api/getStudyProperties"
import type { JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request): Promise<NextResponse<unknown | JatosApiError>> {
  try {
    const { searchParams } = new URL(req.url)
    const studyId = searchParams.get("studyId")

    if (!studyId) {
      const errorResponse: JatosApiError = { error: "Missing studyId" }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const properties = await getStudyProperties(studyId)
    return NextResponse.json(properties)
  } catch (error: any) {
    console.error("Error fetching JATOS properties:", error)
    const errorResponse: JatosApiError = {
      error: error.message || "Failed to fetch study properties",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
