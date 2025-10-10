import { NextResponse } from "next/server"

const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Create multiple PersonalSingle or PersonalMultiple study codes in JATOS.
 * Returns the raw array of generated study codes (unassigned).
 */
export async function POST(req: Request) {
  try {
    const { studyId, batchId, type = "ps", amount = 1 } = await req.json()

    if (!studyId) {
      return NextResponse.json({ error: "Missing required studyId" }, { status: 400 })
    }

    // 🔹 Create personal study codes in JATOS
    const res = await fetch(`${JATOS_BASE}/jatos/api/v1/studies/${studyId}/studyCodes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${JATOS_TOKEN}`,
      },
      body: JSON.stringify({
        type, // "ps" or "pm"
        batchId,
        amount,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: json }, { status: res.status })
    }

    // Return the raw codes for assignment
    const codes = (json ?? []).map((c: any) => ({
      id: c.id,
      code: c.code,
      codeType: c.codeType,
      batchId: c.batchId,
      active: c.active,
    }))

    return NextResponse.json({ studyId, type, amount, codes })
  } catch (err: any) {
    console.error("Error creating personal links:", err)
    return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status: 500 })
  }
}
