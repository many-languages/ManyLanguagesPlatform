import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export async function POST(req: Request) {
  const form = await req.formData()
  const file = form.get("studyFile") as File | null
  if (!file) return NextResponse.json({ error: "Missing studyFile" }, { status: 400 })
  if (!file.name.endsWith(".jzip"))
    return NextResponse.json({ error: "Expected a .jzip" }, { status: 400 })

  // forward to JATOS
  const out = new FormData()
  out.append("study", file, file.name)
  const res = await fetch(`${JATOS_BASE}/jatos/api/v1/study`, {
    method: "POST",
    headers: { accept: "application/json", Authorization: `Bearer ${JATOS_TOKEN}` },
    body: out,
  })

  const text = await res.text()

  if (!res.ok) {
    return NextResponse.json({ error: text }, { status: res.status })
  }

  const json = JSON.parse(text) as {
    id: number
    uuid?: string
    studyExists?: boolean
    currentStudyTitle?: string
    uploadedStudyTitle?: string
    uploadedDirExists?: boolean
  }

  if (!json.uuid) {
    return NextResponse.json({ error: "Missing uuid in JATOS response" }, { status: 502 })
  }

  // Check if study already exists on JATOS
  if (json.studyExists) {
    return NextResponse.json(
      {
        error: "Study already exists on JATOS server",
        studyExists: true,
        jatosStudyId: json.id,
        jatosStudyUUID: json.uuid,
        jatosFileName: file.name,
        currentStudyTitle: json.currentStudyTitle,
        uploadedStudyTitle: json.uploadedStudyTitle,
      },
      { status: 409 }
    )
  }

  // Normal success response
  return NextResponse.json({
    jatosStudyId: json.id,
    jatosStudyUUID: json.uuid,
    jatosFileName: file.name,
  })
}
