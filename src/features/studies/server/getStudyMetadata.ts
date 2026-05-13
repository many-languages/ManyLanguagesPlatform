import { cache } from "react"
import { getResultsMetadataForResearcher } from "@/src/lib/jatos/jatosAccessService"
import { withStudyAccess } from "./withStudyAccess"

export const getStudyMetadataRsc = cache(async (studyId: number) => {
  return withStudyAccess(studyId, async (_studyId, userId) => {
    return getResultsMetadataForResearcher({ studyId, userId })
  })
})
