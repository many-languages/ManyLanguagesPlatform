import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { cache } from "react"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import { deriveStep1Completed } from "../utils/deriveStep1Completed"
import { getBlitzContext } from "@/src/app/blitz-server"

const GetSetupCompletion = z.object({
  studyId: z.number(),
})

const getCachedStudyData = cache(async (studyId: number, userId: number) => {
  return await db.study.findUnique({
    where: {
      id: studyId,
      researchers: {
        some: { userId: userId },
      },
    },
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
})

// Server-side helper for RSCs
export const getSetupCompletionRsc = async (studyId: number) => {
  const { session } = await getBlitzContext()
  const userId = session.userId

  if (!userId) throw new Error("Not authenticated")

  await verifyResearcherStudyAccess(studyId, userId)

  const study = await getCachedStudyData(studyId, userId)

  if (!study) {
    throw new Error("Study not found")
  }

  const latestUpload = study.jatosStudyUploads[0] ?? null
  if (latestUpload) return latestUpload

  return {
    step1Completed: deriveStep1Completed(study),
    step2Completed: false,
    step3Completed: false,
    step4Completed: false,
    step5Completed: false,
    step6Completed: false,
  }
}

// Blitz RPC for client usage with useQuery
export default resolver.pipe(
  resolver.zod(GetSetupCompletion),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getSetupCompletionRsc(studyId) // Reuse the cached RSC function
  }
)
