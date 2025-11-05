/**
 * JATOS API Route: Create Component
 *
 * Creates a new component in a JATOS study.
 *
 * @route POST /api/jatos/create-component
 * @body { jatosStudyId: number, title: string, htmlFilePath: string, comments?: string }
 * @returns Created component ID and UUID
 */
import { NextResponse } from "next/server"
import type { CreateComponentResponse, JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export async function POST(
  req: Request
): Promise<NextResponse<CreateComponentResponse | JatosApiError>> {
  const { jatosStudyId, title, htmlFilePath, comments } = await req.json()

  if (!jatosStudyId || !title || !htmlFilePath) {
    const errorResponse: JatosApiError = { error: "Missing required fields" }
    return NextResponse.json(errorResponse, { status: 400 })
  }

  const payload = {
    title,
    htmlFilePath,
    comments: comments || "Created via MLP integration",
  }

  const res = await fetch(`${JATOS_BASE}/jatos/api/v1/studies/${jatosStudyId}/components/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${JATOS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  if (!res.ok) {
    const errorResponse: JatosApiError = { error: text }
    return NextResponse.json(errorResponse, { status: res.status })
  }

  const json = JSON.parse(text) as { id: number; uuid?: string }
  if (!json.id) {
    const errorResponse: JatosApiError = { error: "Missing id in JATOS response" }
    return NextResponse.json(errorResponse, { status: 502 })
  }

  const successResponse: CreateComponentResponse = {
    jatosComponentId: json.id,
    jatosComponentUUID: json.uuid,
  }
  return NextResponse.json(successResponse)
}
