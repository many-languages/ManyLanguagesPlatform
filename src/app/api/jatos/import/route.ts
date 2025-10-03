import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export async function POST(req: Request) {
  // TODO: enforce Blitz auth/role (RESEARCHER) here if needed

  const form = await req.formData()
  const file = form.get("studyFile") as File | null
  if (!file) return NextResponse.json({ error: "Missing studyFile" }, { status: 400 })
  if (!file.name.endsWith(".jzip"))
    return NextResponse.json({ error: "Expected a .jzip" }, { status: 400 })

  const out = new FormData()
  out.append("study", file, file.name) // File exists in route handlers

  const res = await fetch(`${JATOS_BASE}/jatos/api/v1/study`, {
    method: "POST",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${JATOS_TOKEN}`,
      // DO NOT set Content-Type; fetch will add the boundary
    },
    body: out,
  })

  const text = await res.text()
  if (!res.ok) return NextResponse.json({ error: text }, { status: res.status })

  const json = JSON.parse(text)
  return NextResponse.json({
    jatosStudyId: json.id,
    jatosUUID: json.uuid,
    jatosFileName: file.name,
  })
}
