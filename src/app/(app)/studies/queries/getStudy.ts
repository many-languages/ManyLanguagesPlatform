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
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      researchers: {
        select: { id: true, userId: true, role: true },
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

  return {
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }
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

// Optimized query for the setup shell (StepIndicator)
// Fetches only what is needed to determine the completed steps
export async function findStudySetupStatus(id: number) {
  const study = await db.study.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      sampleSize: true,
      payment: true,
      length: true,
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          step1Completed: true,
          step2Completed: true,
          step3Completed: true,
          step4Completed: true,
          step5Completed: true,
          step6Completed: true,
        },
      },
      // Relations needed for "step1Completed" derivation if not on upload
    },
  })

  if (!study) throw new NotFoundError()

  return {
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }
}

export const getStudySetupStatusRsc = cache(async (id: IdInput) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  return findStudySetupStatus(id)
})
