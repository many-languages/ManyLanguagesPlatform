import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { cache } from "react"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import { deriveStep1Completed } from "../utils/deriveStep1Completed"

const GetSetupCompletion = z.object({
  studyId: z.number(),
})

// Server-side helper for RSCs
export const getSetupCompletionRsc = cache(async (studyId: number) => {
  await verifyResearcherStudyAccess(studyId)

  const study = await db.study.findUnique({
    where: { id: studyId },
    select: {
      title: true,
      description: true,
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          step1Completed: true,
          step2Completed: true,
          step3Completed: true,
          step4Completed: true,
          step5Completed: true,
          step6Completed: true,
        },
      },
    },
  })

  if (!study) {
    throw new Error("Study not found")
  }

  const latestUpload = study.jatosStudyUploads[0] ?? null

  if (latestUpload) {
    return latestUpload
  }

  const step1Completed = deriveStep1Completed(study)

  return {
    step1Completed,
    step2Completed: false,
    step3Completed: false,
    step4Completed: false,
    step5Completed: false,
    step6Completed: false,
  }
})

// Blitz RPC for client usage with useQuery
export default resolver.pipe(
  resolver.zod(GetSetupCompletion),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getSetupCompletionRsc(studyId) // Reuse the cached RSC function
  }
)
