import db from "db"
import { NotFoundError } from "blitz"
import { cache } from "react"
import { GetStudy, IdInput } from "../validations"
import { resolver } from "@blitzjs/rpc"
import { getBlitzContext } from "@/src/app/blitz-server"

// Single-source DB access function
export async function findStudyById(id: number) {
  const study = await db.study.findUnique({
    where: { id },
    include: {
      researchers: {
        select: { id: true, userId: true, role: true, jatosRunUrl: true },
      },
      participations: {
        select: { userId: true },
      },
      FeedbackTemplate: {
        select: { id: true },
      },
    },
  })

  if (!study) throw new NotFoundError()

  return study
}

// Export the return type of the helper function
export type StudyWithRelations = Awaited<ReturnType<typeof findStudyById>>

// Server-side helper for RSCs
export const getStudyRsc = cache(async (id: IdInput) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  return findStudyById(id)
})

// Blitz RPC for client usage with useQuery
const getStudy = resolver.pipe(
  resolver.zod(GetStudy),
  resolver.authorize(), // enforce session
  async ({ id }) => {
    return findStudyById(id)
  }
)

export default getStudy
