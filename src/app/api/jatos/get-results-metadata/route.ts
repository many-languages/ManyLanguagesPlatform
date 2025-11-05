/**
 * JATOS API Route: Get Results Metadata
 *
 * Fetches results metadata from JATOS for specified studies.
 * This route wraps the server-side lib function for client-side usage.
 *
 * @route POST /api/jatos/get-results-metadata
 * @body { studyIds?: number[], studyUuids?: string[] }
 * @returns JATOS results metadata
 */
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { NextRequest, NextResponse } from "next/server"
import type { JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest): Promise<NextResponse<unknown | JatosApiError>> {
  try {
    const body = await req.json()
    const result = await getResultsMetadata(body)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error fetching metadata:", error)
    const errorResponse: JatosApiError = {
      error: error.message || "Failed to fetch results metadata",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
