import { ParticipantStudy } from "@prisma/client"
import { assignPersonalLinks } from "./assignPersonalLinks"

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

/**
 * Orchestrates creation + assignment of JATOS personal links.
 *
 * 1️⃣ Creates personal study codes in JATOS via internal API route.
 * 2️⃣ Assigns the returned codes to participants in the DB.
 */
export async function generateAndAssignPersonalLinks({
  studyId,
  batchId,
  participants,
  type = "ps", // "ps" (PersonalSingle) or "pm" (PersonalMultiple)
}: {
  studyId: number
  batchId?: number
  participants: ParticipantStudy[]
  type?: "ps" | "pm"
}) {
  if (participants.length === 0) throw new Error("No participants provided")

  // 1️⃣ Request study codes from JATOS
  const res = await fetch(`${APP_BASE}/api/jatos/create-personal-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studyId,
      batchId,
      type,
      amount: participants.length,
    }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Failed to create personal links")

  const codes = json.codes
  if (!Array.isArray(codes) || codes.length === 0) {
    throw new Error("No study codes returned from JATOS")
  }

  // 2️⃣ Assign generated codes to participants and persist to DB
  const links = await assignPersonalLinks({ participants, codes })

  return {
    studyId,
    batchId,
    type,
    totalCodes: codes.length,
    assigned: links.length,
    links,
  }
}
