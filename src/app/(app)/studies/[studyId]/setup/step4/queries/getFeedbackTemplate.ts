// src/app/(app)/studies/queries/getFeedbackTemplate.ts
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { z } from "zod"
import { getBlitzContext } from "@/src/app/blitz-server"

const GetFeedbackTemplate = z.object({
  studyId: z.number(),
})

// Server-side helper for RSCs
export const getFeedbackTemplateRsc = cache(async (studyId: number) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  // Get the most recent feedback template for this study
  // If you want to support multiple templates, you can return all of them
  const template = await db.feedbackTemplate.findFirst({
    where: { studyId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return template
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetFeedbackTemplate),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getFeedbackTemplateRsc(studyId)
  }
)
