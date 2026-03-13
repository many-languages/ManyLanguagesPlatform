import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { withStudyAccess } from "../../utils/withStudyAccess"
import { AuthenticationError } from "blitz"

export const createResearcherPilotLinkSchema = z.object({
  studyId: z.number(), // Added to support withStudyAccess
  studyResearcherId: z.number(),
  jatosStudyUploadId: z.number(),
  jatosRunUrl: z.string(),
  markerToken: z.string(),
})

export async function createResearcherPilotLink(
  studyId: number,
  studyResearcherId: number,
  jatosStudyUploadId: number,
  jatosRunUrl: string,
  markerToken: string,
  ctxUserId: number
) {
  const researcher = await db.studyResearcher.findUnique({
    where: { id: studyResearcherId },
    select: { id: true, studyId: true, userId: true },
  })

  // 1. Verify Researcher Exists & Belongs to Study
  if (!researcher || researcher.studyId !== studyId) {
    throw new Error("Researcher not found for this study")
  }

  // 2. [CRITICAL] Verify Ownership: The researcher record must belong to the current authenticated user
  if (researcher.userId !== ctxUserId) {
    throw new AuthenticationError("Unauthorized access to researcher record")
  }

  const upload = await db.jatosStudyUpload.findUnique({
    where: { id: jatosStudyUploadId },
    select: { id: true, studyId: true },
  })

  if (!upload || upload.studyId !== studyId) {
    throw new Error("JATOS upload not found for this study")
  }

  return await db.pilotLink.create({
    data: {
      studyResearcherId: researcher.id,
      jatosStudyUploadId: upload.id,
      jatosRunUrl,
      markerToken,
    },
  })
}

export default resolver.pipe(
  resolver.zod(createResearcherPilotLinkSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, studyResearcherId, jatosStudyUploadId, jatosRunUrl, markerToken }) => {
    // 3. Use withStudyAccess to ensure the user has general access to the study
    return await withStudyAccess(studyId, async (verifiedStudyId: number, userId: number) => {
      // 4. Call the core logic with the trusted userId
      return await createResearcherPilotLink(
        verifiedStudyId,
        studyResearcherId,
        jatosStudyUploadId,
        jatosRunUrl,
        markerToken,
        userId
      )
    })
  }
)
