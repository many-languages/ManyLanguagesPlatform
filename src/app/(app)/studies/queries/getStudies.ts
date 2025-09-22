import db, { Prisma } from "db"
import { resolver } from "@blitzjs/rpc"

interface GetStudiesInput
  extends Pick<Prisma.StudyFindManyArgs, "where" | "orderBy" | "skip" | "take" | "include"> {}

export default resolver.pipe(
  resolver.authorize(),
  async ({ where, orderBy, skip = 0, take = 100, include }: GetStudiesInput) => {
    const [studies, count] = await Promise.all([
      db.study.findMany({
        where,
        orderBy,
        skip,
        take,
        ...(include ? { include } : {}),
      }),
      db.study.count({ where }),
    ])

    const hasMore = skip + take < count
    const nextPage = hasMore ? { take, skip: skip + take } : null

    return {
      studies,
      nextPage,
      hasMore,
      count,
    }
  }
)
