import { Ctx } from "blitz"
import db from "db"
import { Prisma } from "db"
import { getResultsMetadataForResearcherDashboard } from "@/src/lib/jatos/jatosAccessService"
import { countNonPilotResponses } from "@/src/lib/jatos/utils/studyHasParticipantResponses"

export type ActiveStudyWithResponseCount = {
  id: number
  title: string
  sampleSize: number
  responseCount: number
}

/**
 * Fetches all active studies for the researcher (status=OPEN, archived=false)
 * and their response counts from JATOS metadata.
 * Excludes pilot runs (comment contains "pilot:").
 * Counts only FINISHED study results as responses.
 */
export async function getActiveStudiesWithResponseCounts(
  userId: number
): Promise<ActiveStudyWithResponseCount[]> {
  const baseWhere: Prisma.StudyWhereInput = {
    researchers: { some: { userId } },
    archived: false,
    status: "OPEN",
  }

  const studies = await db.study.findMany({
    where: baseWhere,
    select: {
      id: true,
      title: true,
      sampleSize: true,
      jatosStudyUUID: true,
    },
    orderBy: { createdAt: "desc" },
  })

  // Only include studies with JATOS UUID (needed for metadata API)
  const studiesWithUuid = studies.filter(
    (s): s is typeof s & { jatosStudyUUID: string } =>
      s.jatosStudyUUID != null && s.jatosStudyUUID.trim() !== ""
  )

  if (studiesWithUuid.length === 0) {
    return studies.map((s) => ({
      id: s.id,
      title: s.title,
      sampleSize: s.sampleSize,
      responseCount: 0,
    }))
  }

  const studyUuids = studiesWithUuid.map((s) => s.jatosStudyUUID)

  const metadata = await getResultsMetadataForResearcherDashboard({
    studyId: studiesWithUuid[0].id,
    userId,
    studyUuids,
  })
  if (!metadata) {
    return studies.map((s) => ({
      id: s.id,
      title: s.title,
      sampleSize: s.sampleSize,
      responseCount: 0,
    }))
  }

  const metadataByUuid = new Map<string, { responseCount: number }>()
  if (metadata?.data) {
    for (const studyMeta of metadata.data) {
      const responseCount = countNonPilotResponses(studyMeta.studyResults ?? [])
      metadataByUuid.set(studyMeta.studyUuid, { responseCount })
    }
  }

  return studies.map((s) => {
    const uuid = s.jatosStudyUUID
    const meta = uuid ? metadataByUuid.get(uuid) : null
    return {
      id: s.id,
      title: s.title,
      sampleSize: s.sampleSize,
      responseCount: meta?.responseCount ?? 0,
    }
  })
}

// Blitz RPC handler - required for files in queries/ dir. Not used; call getActiveStudiesWithResponseCounts directly.
export default async function getActiveStudiesWithResponseCountsRpc(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()
  return getActiveStudiesWithResponseCounts(ctx.session.userId!)
}
