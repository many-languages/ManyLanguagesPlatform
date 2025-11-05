/**
 * Creates a personal study code in JATOS and saves the generated run URL.
 *
 * This utility consolidates the common pattern of:
 * 1. Creating a personal study code via API
 * 2. Generating a run URL from the code
 * 3. Saving the run URL to the database (ParticipantStudy or StudyResearcher)
 *
 * @example
 * ```ts
 * // For participants
 * const runUrl = await createPersonalStudyCodeAndSave({
 *   jatosStudyId,
 *   jatosBatchId,
 *   type: "ps",
 *   comment: pseudonym,
 *   onSave: (url) => saveJatosRunUrlMutation({ participantStudyId, jatosRunUrl: url }),
 * })
 *
 * // For researchers
 * const runUrl = await createPersonalStudyCodeAndSave({
 *   jatosStudyId,
 *   jatosBatchId,
 *   type: "pm",
 *   comment: "test",
 *   onSave: (url) => saveResearcherJatosRunUrl({ studyResearcherId, jatosRunUrl: url }),
 * })
 * ```
 */

import { callJatosApi } from "./client"
import { generateJatosRunUrl } from "./generateJatosRunUrl"
import type { CreatePersonalStudyCodeResponse } from "@/src/types/jatos-api"

export interface CreatePersonalStudyCodeOptions {
  jatosStudyId: number
  jatosBatchId?: number
  type: "ps" | "pm"
  comment?: string
  onSave: (runUrl: string) => Promise<void>
}

/**
 * Creates a personal study code in JATOS and saves the generated run URL.
 *
 * @param options - Configuration options
 * @returns The generated run URL
 * @throws Error if code creation or saving fails
 */
export async function createPersonalStudyCodeAndSave({
  jatosStudyId,
  jatosBatchId,
  type,
  comment,
  onSave,
}: CreatePersonalStudyCodeOptions): Promise<string> {
  // 1. Create personal study code via API
  const { code } = await callJatosApi<CreatePersonalStudyCodeResponse>(
    "/create-personal-studycode",
    {
      method: "POST",
      body: {
        jatosStudyId,
        jatosBatchId,
        type,
        comment,
      },
    }
  )

  // 2. Generate full run URL from code
  const runUrl = generateJatosRunUrl(code)

  // 3. Save run URL via provided callback (handles both ParticipantStudy and StudyResearcher)
  await onSave(runUrl)

  return runUrl
}
