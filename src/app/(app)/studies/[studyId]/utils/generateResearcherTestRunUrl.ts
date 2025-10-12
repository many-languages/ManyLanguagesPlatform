import { generateJatosRunUrl } from "@/src/app/jatos/utils/generateJatosRunUrl"
import { invoke } from "@blitzjs/rpc"
import type { Ctx } from "blitz"
import saveResearcherJatosRunUrl from "../../mutations/saveResearcherJatosRunUrl"

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
  // 1) Create personal study code in JATOS
  const res = await fetch("/api/jatos/create-personal-studycode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jatosStudyId,
      jatosBatchId,
      type: "ps",
      comment: "test",
    }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Failed to create study code")

  // 2) Generate full run URL
  const runUrl = generateJatosRunUrl(json.code)

  // 3) Save to StudyResearcher record
  if (typeof window !== "undefined") {
    // client-side
    await invoke(saveResearcherJatosRunUrl, { studyResearcherId, jatosRunUrl: runUrl })
  } else {
    // server-side
    if (!ctx) throw new Error("Missing Blitz context (ctx) for server-side call")
    await saveResearcherJatosRunUrl({ studyResearcherId, jatosRunUrl: runUrl }, ctx)
  }

  return runUrl
}
