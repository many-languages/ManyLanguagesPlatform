import { invoke } from "@blitzjs/rpc"
import type { Ctx } from "blitz"
import saveResearcherJatosRunUrl from "../setup/mutations/saveResearcherJatosRunUrl"
import { createPersonalStudyCodeAndSave } from "@/src/lib/jatos/api/createPersonalStudyCodeAndSave"

interface GenerateRunUrlArgs {
  studyResearcherId: number
  jatosStudyId: number
  jatosBatchId: number
  ctx?: Ctx // optional for server-side use
}

/**
 * Generates a JATOS pilot run URL for a researcher and saves it.
 * Works in both client and server contexts.
 * Returns the generated runUrl.
 */
export async function generateAndSaveResearcherPilotRunUrl({
  studyResearcherId,
  jatosStudyId,
  jatosBatchId,
  ctx,
}: GenerateRunUrlArgs): Promise<string> {
  const markerToken = generateMarkerToken()
  // Create personal study code and save run URL
  const runUrl = await createPersonalStudyCodeAndSave({
    jatosStudyId,
    jatosBatchId,
    type: "pm",
    comment: `pilot:${markerToken}`,
    onSave: async (url: string) => {
      if (typeof window !== "undefined") {
        // client-side
        await invoke(saveResearcherJatosRunUrl, {
          studyResearcherId,
          jatosRunUrl: url,
          markerToken,
        })
      } else {
        // server-side
        if (!ctx) throw new Error("Missing Blitz context (ctx) for server-side call")
        await saveResearcherJatosRunUrl({ studyResearcherId, jatosRunUrl: url, markerToken }, ctx)
      }
    },
  })

  return runUrl
}

function generateMarkerToken(): string {
  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.getRandomValues) {
    throw new Error("Crypto API not available for marker token generation")
  }
  const bytes = new Uint8Array(16)
  cryptoObj.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
