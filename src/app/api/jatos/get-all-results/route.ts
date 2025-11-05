/**
 * JATOS API Route: Get All Results
 *
 * Fetches all results from JATOS as a ZIP file for specified studies.
 * Supports both query parameters and JSON body.
 *
 * @route POST /api/jatos/get-all-results
 * @queryParams studyIds (can also be in body)
 * @returns Binary ZIP file with all results
 */
import { NextRequest, NextResponse } from "next/server"
import type { JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE
const JATOS_TOKEN = process.env.JATOS_TOKEN

export async function POST(req: NextRequest): Promise<NextResponse<ArrayBuffer | JatosApiError>> {
  try {
    // Try to parse JSON body (if present)
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    // Collect query parameters (support multiple values per key)
    const url = new URL(req.url)
    const params = Object.fromEntries(url.searchParams.entries())

    // Merge JSON body and query parameters for flexibility
    const mergedPayload = {
      ...body,
      ...Object.entries(params).reduce((acc, [key, value]) => {
        if (acc[key]) {
          acc[key] = Array.isArray(acc[key]) ? [...acc[key], value] : [acc[key], value]
        } else {
          acc[key] = value
        }
        return acc
      }, {} as Record<string, any>),
    }

    const jatosUrl = `${JATOS_BASE}/jatos/api/v1/results`

    const response = await fetch(jatosUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JATOS_TOKEN}`,
      },
      body: JSON.stringify(mergedPayload),
    })

    if (!response.ok) {
      const text = await response.text()
      const errorResponse: JatosApiError = {
        error: `JATOS API error: ${response.status}`,
        details: text,
      }
      return NextResponse.json(errorResponse, { status: response.status })
    }

    // Stream ZIP file back to client
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="jatos-results.zip"`,
      },
    })
  } catch (error: any) {
    console.error("Error fetching JATOS results:", error)
    const errorResponse: JatosApiError = {
      error: "Internal server error",
      details: error.message,
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
