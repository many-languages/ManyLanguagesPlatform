import db, { ParticipantStudy } from "db"

interface JatosCode {
  code: string
  codeType: string
  batchId?: number
  active?: boolean
}

/**
 * Assigns returned JATOS study codes to participants in your database.
 *
 * @param participants - array of participants with IDs and pseudonyms
 * @param codes - array of JATOS study codes (from create-personal-links route)
 * @param jatosBase - optional JATOS base URL for building run URLs
 * @returns list of { participantId, pseudonym, code, runUrl }
 */
export async function assignPersonalLinks({
  participants,
  codes,
  jatosBase = process.env.JATOS_BASE!,
}: {
  participants: ParticipantStudy[]
  codes: JatosCode[]
  jatosBase?: string
}) {
  if (participants.length === 0 || codes.length === 0) {
    throw new Error("Missing participants or codes for assignment")
  }

  if (participants.length !== codes.length) {
    console.warn(
      `⚠️ Participant/code count mismatch: ${participants.length} participants vs ${codes.length} codes`
    )
  }

  const links = participants.map((p, idx) => {
    const c = codes[idx % codes.length] // in case of mismatch
    const runUrl = `${jatosBase}/publix/${c.code}?participantId=${encodeURIComponent(p.pseudonym)}`
    return { participantId: p.id, pseudonym: p.pseudonym, code: c.code, runUrl }
  })

  // 🗄️ Persist to DB (assign each code to participant)
  await Promise.all(
    links.map((l) =>
      db.participantStudy.update({
        where: { id: l.participantId },
        data: { jatosToken: l.code },
      })
    )
  )

  return links
}
