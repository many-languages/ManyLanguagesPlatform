import { cache } from "react"
import { getStudyDataByCommentForResearcher } from "@/src/lib/jatos/jatosAccessService"
import { withStudyAccess } from "./withStudyAccess"

export const getStudyDataByCommentRsc = cache(async (studyId: number, comment: string = "test") => {
  return withStudyAccess(studyId, async (_studyId, userId) => {
    return getStudyDataByCommentForResearcher({ studyId, userId, comment })
  })
})
