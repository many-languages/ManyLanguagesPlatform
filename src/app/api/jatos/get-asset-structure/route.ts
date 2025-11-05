/**
 * JATOS API Route: Get Asset Structure
 *
 * Fetches the asset structure (file tree) for a JATOS study.
 *
 * @route GET /api/jatos/get-asset-structure
 * @queryParams studyId (JATOS study ID)
 * @returns Asset structure tree
 */
import { NextResponse } from "next/server"
import type { JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export async function GET(req: Request): Promise<NextResponse<unknown | JatosApiError>> {
  const { searchParams } = new URL(req.url)
  const studyId = searchParams.get("studyId")

  if (!studyId) {
    const errorResponse: JatosApiError = { error: "Missing studyId" }
    return NextResponse.json(errorResponse, { status: 400 })
  }

  try {
    const res = await fetch(`${JATOS_BASE}/jatos/api/v1/studies/${studyId}/assets/structure`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${JATOS_TOKEN}`,
      },
    })

    const text = await res.text()
    if (!res.ok) {
      const errorResponse: JatosApiError = { error: text }
      return NextResponse.json(errorResponse, { status: res.status })
    }

    const json = JSON.parse(text)
    return NextResponse.json(json)
  } catch (err: any) {
    console.error("Error fetching asset structure:", err)
    const errorResponse: JatosApiError = {
      error: "Failed to fetch asset structure",
      details: err.message,
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
