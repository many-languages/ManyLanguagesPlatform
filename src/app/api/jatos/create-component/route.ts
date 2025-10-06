import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export async function POST(req: Request) {
  const { jatosStudyId, title, htmlFilePath, comments } = await req.json()

  if (!jatosStudyId || !title || !htmlFilePath) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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
  if (!res.ok) return NextResponse.json({ error: text }, { status: res.status })

  const json = JSON.parse(text) as { id: number; uuid?: string }
  if (!json.id) return NextResponse.json({ error: "Missing id in JATOS response" }, { status: 502 })

  return NextResponse.json({
    jatosComponentId: json.id,
    jatosComponentUUID: json.uuid,
  })
}
