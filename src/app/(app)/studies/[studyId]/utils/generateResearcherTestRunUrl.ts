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
 * Generates a JATOS test run URL for a researcher and saves it.
 * Works in both client and server contexts.
 * Returns the generated runUrl.
 */
export async function generateAndSaveResearcherTestRunUrl({
  studyResearcherId,
  jatosStudyId,
  jatosBatchId,
  ctx,
}: GenerateRunUrlArgs): Promise<string> {
  // Create personal study code and save run URL
  const runUrl = await createPersonalStudyCodeAndSave({
    jatosStudyId,
    jatosBatchId,
    type: "pm",
    comment: "test",
    onSave: async (url: string) => {
      if (typeof window !== "undefined") {
        // client-side
        await invoke(saveResearcherJatosRunUrl, {
          studyResearcherId,
          jatosRunUrl: url,
        })
      } else {
        // server-side
        if (!ctx) throw new Error("Missing Blitz context (ctx) for server-side call")
        await saveResearcherJatosRunUrl({ studyResearcherId, jatosRunUrl: url }, ctx)
      }
    },
  })

  return runUrl
}
