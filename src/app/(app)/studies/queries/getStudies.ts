import db, { Prisma } from "db"
import { cache } from "react"
import { resolver } from "@blitzjs/rpc"
import { getBlitzContext } from "@/src/app/blitz-server"
import { GetStudiesInput } from "../validations"

interface GetStudiesInputType
  extends Pick<Prisma.StudyFindManyArgs, "where" | "orderBy" | "skip" | "take" | "include"> {}

// Shared DB helper
async function findStudies(
  args: Pick<Prisma.StudyFindManyArgs, "where" | "orderBy" | "skip" | "take" | "include">
) {
  const include = {
    ...(args.include ?? {}),
    jatosStudyUploads: {
      orderBy: { createdAt: "desc" },
      take: 1,
    },
  }
  const [studies, count] = await Promise.all([
    db.study.findMany({ ...args, include }),
    db.study.count({ where: args.where }),
  ])

  const studiesWithLatestUpload = studies.map((study) => ({
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }))

  const hasMore = (args.skip ?? 0) + (args.take ?? 100) < count
  const nextPage = hasMore ? { take: args.take, skip: (args.skip ?? 0) + (args.take ?? 100) } : null

  return { studies: studiesWithLatestUpload, nextPage, hasMore, count }
}

export type StudyWithLatestUpload = Awaited<ReturnType<typeof findStudies>>["studies"][number]

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
