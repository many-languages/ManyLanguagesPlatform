import db from "db"
import { NotFoundError } from "blitz"
import { cache } from "react"
import { StudyId, StudyIdInput } from "../validations"
import { resolver } from "@blitzjs/rpc"
import { getBlitzContext } from "@/src/app/blitz-server"

// Single-source DB access function
export async function findStudyById(id: number) {
  const study = await db.study.findUnique({
    where: { id },
    // include: {
    //   researchers: { include: { user: true } },
    //   participations: { include: { participant: true } },
    // },
  })
  if (!study) throw new NotFoundError()
  return study
}

// Server-side helper for RSCs
export const getStudy = cache(async ({ id }: StudyIdInput) => {
  const ctx = await getBlitzContext()
  if (!ctx.session.userId) throw new Error("Not authenticated")
  return findStudyById(id)
})

// Blitz RPC for client usage with useQuery
export default resolver.pipe(
  resolver.zod(StudyId),
  resolver.authorize(), // enforce session
  async ({ id }) => {
    return findStudyById(id)
  }
)
