import db, { Prisma } from "db"
import { cache } from "react"
import { GetStudies, GetStudiesInput } from "../validations"
import { resolver } from "@blitzjs/rpc"
import { getBlitzContext } from "@/src/app/blitz-server"

// Shared DB helper
async function findStudies(
  args: Pick<Prisma.StudyFindManyArgs, "where" | "orderBy" | "skip" | "take" | "include">
) {
  const [studies, count] = await Promise.all([
    db.study.findMany(args),
    db.study.count({ where: args.where }),
  ])

  const hasMore = (args.skip ?? 0) + (args.take ?? 100) < count
  const nextPage = hasMore ? { take: args.take, skip: (args.skip ?? 0) + (args.take ?? 100) } : null

  return { studies, nextPage, hasMore, count }
}

// Server helper (RSC use)
export const getStudies = cache(
  async (
    args: GetStudiesInput &
      Pick<Prisma.StudyFindManyArgs, "where" | "orderBy" | "skip" | "take" | "include">
  ) => {
    const { session } = await getBlitzContext()
    if (!session.userId) throw new Error("Not authenticated")

    return findStudies(args)
  }
)

// Blitz RPC (client-side use)
export default resolver.pipe(
  resolver.zod(GetStudies), // runtime guard for skip/take
  resolver.authorize(),
  async ({
    skip,
    take,
    ...rest
  }: GetStudiesInput & Omit<Prisma.StudyFindManyArgs, "skip" | "take">) => {
    return findStudies({ skip, take, ...rest })
  }
)
