/**
 * JATOS API Route: Get Results Data
 *
 * Fetches raw results data (ZIP file) from JATOS for specified studies.
 * This route wraps the server-side lib function for client-side usage.
 *
 * @route POST /api/jatos/get-results-data
 * @queryParams studyIds (query parameter or body)
 * @returns Binary ZIP file with results data
 */
import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { NextRequest, NextResponse } from "next/server"
import type { JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest): Promise<NextResponse<ArrayBuffer | JatosApiError>> {
  try {
    const url = new URL(req.url)
    const params = Object.fromEntries(url.searchParams.entries())

    const result = await getResultsData(params)

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": "inline; filename=jatos-results.zip",
      },
    })
  } catch (error: any) {
    console.error("Error fetching results data:", error)
    const errorResponse: JatosApiError = {
      error: error.message || "Failed to fetch results data",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
