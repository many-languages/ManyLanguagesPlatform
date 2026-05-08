import { cache } from "react"
import db from "db"
import { deriveStep1Completed } from "../domain/setup/deriveStep1Completed"
import { isSetupCompleteFromFlags, type SetupStepFlags } from "../domain/setup/setupStatus"
import { withStudyAccess } from "./access"

export { isSetupCompleteFromFlags }
export type { SetupStepFlags }

const fetchStudyData = cache(async (studyId: number, userId: number) => {
  return db.study.findUnique({
    where: {
      id: studyId,
      researchers: {
        some: { userId },
      },
    },
    select: {
      title: true,
      description: true,
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          step1Completed: true,
          step2Completed: true,
          step3Completed: true,
          step4Completed: true,
          step5Completed: true,
          step6Completed: true,
        },
      },
    },
  })
})

export const getSetupCompletionRsc = async (studyId: number): Promise<SetupStepFlags> => {
  return withStudyAccess(studyId, async (sId, uId) => {
    const study = await fetchStudyData(sId, uId)

    if (!study) {
      throw new Error("Study not found")
    }

    const latestUpload = study.jatosStudyUploads[0] ?? null
    if (latestUpload) return latestUpload

    return {
      step1Completed: deriveStep1Completed(study),
      step2Completed: false,
      step3Completed: false,
      step4Completed: false,
      step5Completed: false,
      step6Completed: false,
    }
  })
}
