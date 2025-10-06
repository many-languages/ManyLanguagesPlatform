import { NextResponse } from "next/server"
import db from "db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export async function POST(req: Request) {
  const { batchId, studyCode, pseudonym, participantId } = await req.json()

  if (!batchId || !studyCode || !pseudonym || !participantId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const res = await fetch(`${JATOS_BASE}/jatos/api/v1/batches/${batchId}/worker`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${JATOS_TOKEN}`,
    },
    body: JSON.stringify({ workerType: "PersonalSingle" }),
  })

  const text = await res.text()
  if (!res.ok) return NextResponse.json({ error: text }, { status: res.status })

  const json = JSON.parse(text)
  const workerId = json.workerId

  const runUrl = `${JATOS_BASE}/publix/${studyCode}/start?token=${workerId}&participantId=${pseudonym}`
  console.log("workerId", workerId)
  // optionally persist token in DB
  await db.participantStudy.update({
    where: { id: participantId },
    data: { jatosToken: workerId },
  })

  return NextResponse.json({ runUrl, workerId })
}
