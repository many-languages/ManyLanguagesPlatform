import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"

const GetSetupCompletion = z.object({
  studyId: z.number(),
})

// Server-side helper for RSCs
export const getSetupCompletionRsc = cache(async (studyId: number) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  const study = await db.study.findUnique({
    where: { id: studyId },
    select: {
      step1Completed: true,
      step2Completed: true,
      step3Completed: true,
      step4Completed: true,
    },
  })

  if (!study) {
    throw new Error("Study not found")
  }

  return study
})

// Blitz RPC for client usage with useQuery
export default resolver.pipe(
  resolver.zod(GetSetupCompletion),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    const study = await db.study.findUnique({
      where: { id: studyId },
      select: {
        step1Completed: true,
        step2Completed: true,
        step3Completed: true,
        step4Completed: true,
      },
    })

    if (!study) {
      throw new Error("Study not found")
    }

    return study
  }
)
