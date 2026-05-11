import { resolver } from "@blitzjs/rpc"
import { GetStudiesInput } from "@/src/features/studies/validations"
import { getStudies } from "../server/getStudies"

export default resolver.pipe(resolver.zod(GetStudiesInput), resolver.authorize(), async (input) => {
  return getStudies(input)
})
