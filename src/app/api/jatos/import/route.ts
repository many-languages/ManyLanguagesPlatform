import { NextResponse } from "next/server"
import db from "db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

const DUP_MSG =
  "A study with this uuid has been already uploaded to our servers. Please change the uuid in the .jas file in your .jzip folder and try again."

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
  if (!res.ok) return NextResponse.json({ error: text }, { status: res.status })

  const json = JSON.parse(text) as { id: number; uuid?: string }
  if (!json.uuid)
    return NextResponse.json({ error: "Missing uuid in JATOS response" }, { status: 502 })

  // ❗ duplicate check in DB
  const existing = await db.study.findFirst({ where: { jatosStudyUUID: json.uuid } })
  if (existing) return NextResponse.json({ error: DUP_MSG }, { status: 409 })

  return NextResponse.json({
    jatosStudyId: json.id,
    jatosStudyUUID: json.uuid,
    jatosFileName: file.name,
  })
}
