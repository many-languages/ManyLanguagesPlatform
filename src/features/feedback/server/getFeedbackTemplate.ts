import db from "db"
import { cache } from "react"
import { withStudyAccess } from "@/src/features/studies/services"
import { getBlitzContext } from "@/src/app/blitz-server"
import {
  feedbackTemplateSelect,
  type FeedbackTemplateRscRow,
} from "@/src/features/feedback/feedbackTemplateRscSelect"

export type { FeedbackTemplateRscRow }

export type GetFeedbackTemplateForParticipantResult =
  | { kind: "ok"; template: FeedbackTemplateRscRow | null; userId: number }
  | { kind: "not_authenticated" }
  | { kind: "not_enrolled" }

export type GetFeedbackTemplateForResearcherResult =
  | { kind: "ok"; template: FeedbackTemplateRscRow | null; userId: number }
  | { kind: "not_authenticated" }
  | { kind: "not_authorized" }

async function findFeedbackTemplateForStudy(studyId: number) {
  return db.feedbackTemplate.findFirst({
    where: { studyId },
    orderBy: { updatedAt: "desc" },
    select: feedbackTemplateSelect,
  })
}

export const getFeedbackTemplateRsc = cache(async (studyId: number) => {
  return withStudyAccess(studyId, async (_sId, _uId) => {
    return findFeedbackTemplateForStudy(studyId)
  })
})

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

    const template = await findFeedbackTemplateForStudy(studyId)
    return { kind: "ok", template, userId }
  }
)

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

    const template = await findFeedbackTemplateForStudy(studyId)
    return { kind: "ok", template, userId }
  }
)
