import db from "db"
import { getOrGenerateJatosToken } from "./tokenCache"
import { provisionResearcherJatos } from "./provisioning/provisionResearcherJatos"

/**
 * Resolves the current researcher's JIT token for JATOS API calls.
 * Used when the researcher is in session and performing operations on their own studies.
 *
 * 1. Look up ResearcherJatos for the given userId
 * 2. If found: return JIT token via getOrGenerateJatosToken
 * 3. If not found: attempt lazy provisioning via provisionResearcherJatos, then return token
 * 4. Last resort: return JATOS_TOKEN (degraded mode, logged as warning)
 */
export async function getTokenForResearcher(userId: number): Promise<string> {
  let researcherJatos = await db.researcherJatos.findUnique({
    where: { userId },
    select: { jatosUserId: true },
  })

  if (!researcherJatos) {
    try {
      const result = await provisionResearcherJatos(userId)
      researcherJatos = { jatosUserId: result.jatosUserId }
    } catch (err) {
      console.warn(
        `[JATOS] Failed to provision researcher ${userId}, falling back to JATOS_TOKEN:`,
        err
      )
      return process.env.JATOS_TOKEN!
    }
  }

  return getOrGenerateJatosToken(researcherJatos!.jatosUserId, String(userId))
}
