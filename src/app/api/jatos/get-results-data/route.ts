/**
 * JATOS API Route: Get Results Data
 *
 * Fetches raw results data (ZIP file) from JATOS for specified studies.
 * Researcher-only: uses researcher's JIT token.
 *
 * @route POST /api/jatos/get-results-data
 * @body { studyIds?: number | number[], studyResultIds?: number | number[], ... } (integers per JATOS spec)
 * @returns Binary ZIP file with results data
 */
import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { NextRequest, NextResponse } from "next/server"
import { getBlitzContext } from "@/src/app/blitz-server"
import { getTokenForResearcher } from "@/src/lib/jatos/getTokenForResearcher"
import type { JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest): Promise<NextResponse<ArrayBuffer | JatosApiError>> {
  try {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      const errorResponse: JatosApiError = { error: "Not authenticated" }
      return NextResponse.json(errorResponse, { status: 401 })
    }

    const token = await getTokenForResearcher(userId)

    let params: Record<string, unknown> = {}
    try {
      params = (await req.json()) as Record<string, unknown>
    } catch {
      const errorResponse: JatosApiError = {
        error: "Request body must be JSON with integer ID params (e.g. { studyIds: 123 })",
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const result = await getResultsData(params, { token })

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": "inline; filename=jatos-results.zip",
      },
    })
  } catch (error: any) {
    const message = error?.message || "Failed to fetch results data"
    const isValidationError = typeof message === "string" && message.includes("must be an integer")
    console.error("Error fetching results data:", error)
    const errorResponse: JatosApiError = { error: message }
    return NextResponse.json(errorResponse, { status: isValidationError ? 400 : 500 })
  }
}
