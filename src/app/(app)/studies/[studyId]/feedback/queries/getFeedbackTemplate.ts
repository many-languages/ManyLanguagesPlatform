import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { GetFeedbackTemplateSchema } from "../validations"
import { withStudyAccess } from "../../utils/withStudyAccess"
import { getBlitzContext } from "@/src/app/blitz-server"
import { feedbackTemplateSelect, type FeedbackTemplateRscRow } from "../feedbackTemplateRscSelect"

export type { FeedbackTemplateRscRow }

/** Participant template fetch: no throws for auth — use `kind` for RSC UI. */
export type GetFeedbackTemplateForParticipantResult =
  | { kind: "ok"; template: FeedbackTemplateRscRow | null; userId: number }
  | { kind: "not_authenticated" }
  | { kind: "not_enrolled" }

/** Researcher template fetch: no throws for auth/access — use `kind` for RSC UI. */
export type GetFeedbackTemplateForResearcherResult =
  | { kind: "ok"; template: FeedbackTemplateRscRow | null; userId: number }
  | { kind: "not_authenticated" }
  | { kind: "not_authorized" }

// Server-side helper for RSCs
export const getFeedbackTemplateRsc = cache(async (studyId: number) => {
  return withStudyAccess(studyId, async (_sId, _uId) => {
    const template = await db.feedbackTemplate.findFirst({
      where: { studyId },
      orderBy: { updatedAt: "desc" },
      select: feedbackTemplateSelect,
    })

    return template
  })
})

/**
 * Same template row as `getFeedbackTemplateRsc`, for enrolled participants (not researchers).
 * Returns a discriminated result so RSCs can render `Alert` instead of try/catch on throws.
 */
export const getFeedbackTemplateForParticipantRsc = cache(
  async (studyId: number): Promise<GetFeedbackTemplateForParticipantResult> => {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return { kind: "not_authenticated" }
    }

    const participant = await db.participantStudy.findUnique({
      where: { userId_studyId: { userId, studyId } },
      select: { id: true },
    })
    if (!participant) {
      return { kind: "not_enrolled" }
    }

    const template = await db.feedbackTemplate.findFirst({
      where: { studyId },
      orderBy: { updatedAt: "desc" },
      select: feedbackTemplateSelect,
    })

    return { kind: "ok", template, userId }
  }
)

/**
 * Same template row as `getFeedbackTemplateRsc`, for researchers with study access.
 * Returns a discriminated result so RSCs can render `Alert` instead of try/catch on throws.
 */
export const getFeedbackTemplateForResearcherRsc = cache(
  async (studyId: number): Promise<GetFeedbackTemplateForResearcherResult> => {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return { kind: "not_authenticated" }
    }

    const researcher = await db.studyResearcher.findFirst({
      where: { studyId, userId },
    })
    if (!researcher) {
      return { kind: "not_authorized" }
    }

    const template = await db.feedbackTemplate.findFirst({
      where: { studyId },
      orderBy: { updatedAt: "desc" },
      select: feedbackTemplateSelect,
    })

    return { kind: "ok", template, userId }
  }
)

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetFeedbackTemplateSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getFeedbackTemplateRsc(studyId)
  }
)
