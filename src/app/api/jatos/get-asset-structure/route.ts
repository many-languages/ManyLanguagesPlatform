import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studyId = searchParams.get("studyId")

  if (!studyId) {
    return NextResponse.json({ error: "Missing studyId" }, { status: 400 })
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
      return NextResponse.json({ error: text }, { status: res.status })
    }

    const json = JSON.parse(text)

    return NextResponse.json(json)
  } catch (err: any) {
    console.error("Error fetching asset structure:", err)
    return NextResponse.json(
      { error: "Failed to fetch asset structure", details: err.message },
      { status: 500 }
    )
  }
}
