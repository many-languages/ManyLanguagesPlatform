import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { z } from "zod"
import { getBlitzContext } from "@/src/app/blitz-server"

export const GetStudyMetadataSchema = z.object({
  studyId: z.number().int().positive(),
})

// Core database and API function
async function fetchStudyMetadata(studyId: number) {
  // 1) Get latest JATOS ID from uploads
  const study = await db.study.findFirst({
    where: { id: studyId },
    select: {
      id: true,
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { jatosStudyId: true },
      },
    },
  })
  if (!study) throw new Error("Study not found")
  const jatosStudyId = study.jatosStudyUploads[0]?.jatosStudyId ?? null
  if (!jatosStudyId) throw new Error("Study does not have JATOS ID")

  // 2) Fetch metadata from JATOS API
  const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] })

  return metadata
}

// Server-side helper for RSCs
export const getStudyMetadataRsc = cache(async (studyId: number) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")
  // Note: RSC helper doesn't check role, but RPC resolver does

  return fetchStudyMetadata(studyId)
})

// Blitz RPC for client usage (with role check)
export default resolver.pipe(
  resolver.zod(GetStudyMetadataSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return fetchStudyMetadata(studyId)
  }
)
