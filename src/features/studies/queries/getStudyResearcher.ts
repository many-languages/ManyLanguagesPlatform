import { resolver } from "@blitzjs/rpc"
import { GetStudyResearcher } from "@/src/features/studies/validations"
import { getStudyResearcherRsc } from "../server/getStudyResearcher"

export default resolver.pipe(
  resolver.zod(GetStudyResearcher),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getStudyResearcherRsc(studyId)
  }
)
