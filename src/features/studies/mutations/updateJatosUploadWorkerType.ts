import { resolver } from "@blitzjs/rpc"
import { UpdateJatosUploadWorkerType } from "@/src/features/studies/validations"
import { updateJatosUploadWorkerType } from "../server/studySetupWrites"

export default resolver.pipe(
  resolver.zod(UpdateJatosUploadWorkerType),
  resolver.authorize(),
  async ({ studyId, jatosWorkerType }) => {
    return updateJatosUploadWorkerType({ studyId, jatosWorkerType })
  }
)
