import db, { Prisma } from "db"
import { cache } from "react"
import { resolver } from "@blitzjs/rpc"
import { getBlitzContext } from "@/src/app/blitz-server"
import { GetStudiesInput } from "@/src/features/studies/validations"
import { studyWithLatestUploadSelect } from "../studySelects"
import type { StudyWithLatestUpload } from "../types"

interface GetStudiesInputType
  extends Pick<Prisma.StudyFindManyArgs, "where" | "orderBy" | "skip" | "take"> {}

type GetStudiesResult = {
  studies: StudyWithLatestUpload[]
  nextPage: Pick<Prisma.StudyFindManyArgs, "take" | "skip"> | null
  hasMore: boolean
  count: number
}

function attachLatestJatosStudyUpload(
  study: Omit<StudyWithLatestUpload, "latestJatosStudyUpload">
): StudyWithLatestUpload {
  return {
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }
}

// Shared DB helper
async function findStudies(
  args: Pick<Prisma.StudyFindManyArgs, "where" | "orderBy" | "skip" | "take">
): Promise<GetStudiesResult> {
  const [studies, count] = await Promise.all([
    db.study.findMany({ ...args, select: studyWithLatestUploadSelect }),
    db.study.count({ where: args.where }),
  ])

  const studiesWithLatestUpload = studies.map(attachLatestJatosStudyUpload)

  const hasMore = (args.skip ?? 0) + (args.take ?? 100) < count
  const nextPage = hasMore ? { take: args.take, skip: (args.skip ?? 0) + (args.take ?? 100) } : null

  return { studies: studiesWithLatestUpload, nextPage, hasMore, count }
}

// Server helper (RSC use)
export const getStudies = cache(async (args: GetStudiesInputType) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  return findStudies(args)
})

// Blitz RPC (client-side use)
export default resolver.pipe(resolver.zod(GetStudiesInput), resolver.authorize(), async (input) => {
  return findStudies(input)
})
