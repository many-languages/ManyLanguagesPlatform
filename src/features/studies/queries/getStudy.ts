import { GetStudy, IdInput } from "@/src/features/studies/validations"
import { resolver } from "@blitzjs/rpc"
import { getStudyRsc } from "../server/getStudy"

const getStudy = resolver.pipe(
  resolver.zod(GetStudy),
  resolver.authorize(), // enforce session
  async ({ id }) => {
    return getStudyRsc(id as IdInput)
  }
)

export default getStudy
