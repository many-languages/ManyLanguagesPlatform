const JATOS_BASE = process.env.JATOS_BASE!
const APP_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

/**
 * Generate GeneralSingle or GeneralMultiple links for participants.
 * Uses /api/jatos/get-study-code to fetch the study's general link.
 */
export async function generateGeneralLinks({
  studyId,
  type = "gs", // "gs" = GeneralSingle, "gm" = GeneralMultiple
  participants,
}: {
  studyId: number
  type?: "gs" | "gm"
  participants: { id: number; pseudonym: string }[]
}) {
  // 🔹 Fetch general study code from our own route
  const res = await fetch(`${APP_BASE}/api/jatos/get-study-code?studyId=${studyId}&type=${type}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Failed to fetch study code")

  const studyCode = json.code
  if (!studyCode) throw new Error("No general study code found")

  // 🔹 Generate per-participant URLs
  const baseRunUrl = `${JATOS_BASE}/publix/${studyCode}`

  const links = participants.map((p) => ({
    participantId: p.id,
    pseudonym: p.pseudonym,
    runUrl: `${baseRunUrl}?participantId=${encodeURIComponent(p.pseudonym)}`,
  }))

  return {
    type,
    studyId,
    baseCode: studyCode,
    baseRunUrl,
    links,
  }
}
