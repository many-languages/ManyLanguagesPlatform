import db from "db"
import { getTokenForResearcher } from "../tokenBroker"
import { provisionResearcherJatos } from "../provisioning/provisionResearcherJatos"
import { addStudyMember } from "../client/addStudyMember"
import type { ResearcherRole } from "db"

/** Explicit role priority for deterministic researcher selection. */
const RESEARCHER_ROLE_PRIORITY: Record<ResearcherRole, number> = {
  PI: 0,
  COLLABORATOR: 1,
  VIEWER: 2,
}

/**
 * Ensures the admin has JATOS study membership so they can delete the study
 * using their own token. Uses a researcher's token to add the admin (no admin token).
 *
 * Idempotent: if the admin is already a study member, no-op.
 *
 * @throws if study has no researchers (fail loudly, no silent fallback)
 */
export async function grantAdminStudyAccessForDeletion({
  studyId,
  jatosStudyId,
  adminUserId,
}: {
  studyId: number
  jatosStudyId: number
  adminUserId: number
}): Promise<void> {
  const researchers = await db.studyResearcher.findMany({
    where: { studyId },
    select: { userId: true, role: true, createdAt: true },
  })

  if (researchers.length === 0) {
    throw new Error(
      `[JATOS] Cannot grant admin study access: study ${studyId} has no researchers. ` +
        "Admin deletion requires at least one researcher to delegate add-member authority."
    )
  }

  const adminIsResearcher = researchers.some((r) => r.userId === adminUserId)
  if (adminIsResearcher) {
    return
  }

  const sorted = [...researchers].sort((a, b) => {
    const pa = RESEARCHER_ROLE_PRIORITY[a.role] ?? 999
    const pb = RESEARCHER_ROLE_PRIORITY[b.role] ?? 999
    if (pa !== pb) return pa - pb
    const ca = a.createdAt.getTime()
    const cb = b.createdAt.getTime()
    if (ca !== cb) return ca - cb
    return a.userId - b.userId
  })
  const delegateResearcherUserId = sorted[0]!.userId

  const { jatosUserId: adminJatosUserId } = await provisionResearcherJatos(adminUserId)
  const delegateToken = await getTokenForResearcher(delegateResearcherUserId)

  await addStudyMember(
    { studyId: jatosStudyId, userId: adminJatosUserId },
    { token: delegateToken }
  )
}
