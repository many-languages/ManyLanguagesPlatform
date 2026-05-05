import db from "db"
import { NotFoundError } from "blitz"
import { cache } from "react"
import { GetStudy, IdInput } from "@/src/features/studies/validations"
import { resolver } from "@blitzjs/rpc"
import { getBlitzContext } from "@/src/app/blitz-server"
import { studyWithRelationsArgs } from "../studySelects"
import type { StudyWithRelations } from "../types"

function attachLatestJatosStudyUpload(
  study: Omit<StudyWithRelations, "latestJatosStudyUpload">
): StudyWithRelations {
  return {
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }
}

// Single-source DB access function
export async function findStudyById(id: number): Promise<StudyWithRelations> {
  const study = await db.study.findUnique({
    where: { id },
    ...studyWithRelationsArgs,
  })

  if (!study) throw new NotFoundError()

  return attachLatestJatosStudyUpload(study)
}

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
