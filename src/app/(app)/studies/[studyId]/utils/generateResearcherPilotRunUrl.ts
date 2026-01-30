import { invoke } from "@blitzjs/rpc"
import type { Ctx } from "blitz"
import createResearcherPilotLink from "../setup/mutations/createResearcherPilotLink"
import { createPersonalStudyCodeAndSave } from "@/src/lib/jatos/api/createPersonalStudyCodeAndSave"

interface GenerateRunUrlArgs {
  studyId: number // Added
  studyResearcherId: number
  jatosStudyUploadId: number
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
  studyId,
  studyResearcherId,
  jatosStudyUploadId,
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
        await invoke(createResearcherPilotLink, {
          studyId,
          studyResearcherId,
          jatosStudyUploadId,
          jatosRunUrl: url,
          markerToken,
        })
      } else {
        // server-side
        if (!ctx) throw new Error("Missing Blitz context (ctx) for server-side call")
        // Note: For server-side usage, we need the ctx.session.userId to be passed correctly by the mutation wrapper locally or via direct call
        // But createResearcherPilotLink is a mutation resolver or function.
        // If we call the function directly (exported as createResearcherPilotLink), it expects ctxUserId.
        // The invoke() handles the resolver pipeline.
        // If we call direct logic, we need to adapt.
        // However, the previous code called the DEFAULT export (resolver) or the named export?
        // Previous default was resolver.pipe(...)
        // import saveResearcherJatosRunUrl from ... (default export)
        // server-side call: await saveResearcherJatosRunUrl({args}, ctx) -> This is calling the resolver with ctx.

        await createResearcherPilotLink(
          { studyId, studyResearcherId, jatosStudyUploadId, jatosRunUrl: url, markerToken },
          ctx
        )
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
