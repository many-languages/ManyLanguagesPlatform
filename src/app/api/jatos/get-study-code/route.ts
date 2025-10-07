import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studyId = searchParams.get("studyId")
    const type = searchParams.get("type") ?? "gs" // default to GeneralSingle

    if (!studyId) {
      return NextResponse.json({ error: "Missing studyId" }, { status: 400 })
    }

    // 🔹 Request study codes from JATOS
    const res = await fetch(
      `${JATOS_BASE}/jatos/api/v1/studies/${studyId}/studyCodes?type=${type}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${JATOS_TOKEN}`,
        },
      }
    )

    const json = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: json }, { status: res.status })
    }

    // 🔹 Extract the first available code (usually only one for general types)
    const studyCode = json?.[0]?.code ?? null
    if (!studyCode) {
      return NextResponse.json({ error: "No study code found" }, { status: 404 })
    }

    return NextResponse.json({
      studyId,
      type,
      code: studyCode,
      codeType: json[0]?.codeType,
      batchId: json[0]?.batchId,
    })
  } catch (err: any) {
    console.error("Error fetching JATOS study code:", err)
    return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status: 500 })
  }
}
