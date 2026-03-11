import db from "db"
import { createJatosUser } from "../api/admin/createJatosUser"

export interface ProvisionResearcherJatosResult {
  jatosUserId: number
}

/**
 * Provisions a researcher with a JATOS user account.
 * Creates the JATOS user and stores the mapping in ResearcherJatos.
 * Idempotent: if the researcher already has a JATOS user, returns the existing jatosUserId.
 */
export async function provisionResearcherJatos(
  userId: number
): Promise<ProvisionResearcherJatosResult> {
  const existing = await db.researcherJatos.findUnique({
    where: { userId },
    select: { jatosUserId: true },
  })

  if (existing) {
    return { jatosUserId: existing.jatosUserId }
  }

  const jatosUser = await createJatosUser({
    username: `mlp-researcher-${userId}`,
    name: `MLP Researcher ${userId}`,
  })

  await db.researcherJatos.create({
    data: {
      userId,
      jatosUserId: jatosUser.id,
    },
  })

  return { jatosUserId: jatosUser.id }
}
