import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

/**
 * Creates a single commented personal link (PersonalSingle or PersonalMultiple)
 * via GET /jatos/api/v1/studies/{id}/studyCodes
 */
export async function POST(req: Request) {
  try {
    const { jatosStudyId, jatosBatchId, type = "ps", comment } = await req.json()

    if (!jatosStudyId) {
      return NextResponse.json({ error: "Missing required field: jatosStudyId" }, { status: 400 })
    }

    // Build query parameters
    const params = new URLSearchParams({
      type,
      amount: "1",
      ...(jatosBatchId ? { batchId: String(jatosBatchId) } : {}),
      ...(comment ? { comment } : {}),
    })

    const url = `${JATOS_BASE}/jatos/api/v1/studies/${jatosStudyId}/studyCodes?${params.toString()}`

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${JATOS_TOKEN}`,
      },
    })

    const text = await res.text()

    if (!res.ok) {
      console.error("JATOS error:", text)
      return NextResponse.json({ error: text }, { status: res.status })
    }

    // Try to parse JSON safely
    let json: any
    try {
      json = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: "Invalid JSON from JATOS" }, { status: 502 })
    }

    const data = json.data

    // JATOS REST API returns only the created studycode, but the comments passed as query params through GET are there
    const code = data[0]

    if (!code) {
      return NextResponse.json({ error: "No study code returned from JATOS" }, { status: 502 })
    }

    return NextResponse.json({ code })
  } catch (err: any) {
    console.error("Error creating single personal link:", err)
    return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status: 500 })
  }
}
