"use client"

import { Route } from "next"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import { FORM_ERROR } from "@/src/components/ui/Form"
import toast from "react-hot-toast"

import updateStudy from "@/src/features/studies/mutations/updateStudy"
import StudyInformationForm from "./StudyInformationForm"
import { parseReturnToQueryParam } from "../../../../domain/setup/parseReturnToQueryParam"
import { getPostStepNavigationUrl } from "../../../../domain/setup/setupStatus"
import { studyPath } from "../../../../domain/setup/setupRoutes"

import type { StudyWithRelations } from "../../../../types"

interface Step1ContentProps {
  study: StudyWithRelations
  studyId: number
  isEditMode?: boolean
  returnTo?: string
}

export default function Step1Content({
  study,
  studyId,
  isEditMode = false,
  returnTo = "step2",
}: Step1ContentProps) {
  const router = useRouter()
  // const { study, studyId } = useStudySetup() // Removed context usage
  const [updateStudyMutation] = useMutation(updateStudy)

  const getNavigationPath = (): string => {
    const target = parseReturnToQueryParam(returnTo)
    if (target === "study") {
      return getPostStepNavigationUrl(studyId, 1, "study")
    }
    if (target.startsWith("step")) {
      const stepNum = parseInt(target.replace("step", ""), 10)
      return getPostStepNavigationUrl(studyId, 1, stepNum, study)
    }
    return getPostStepNavigationUrl(studyId, 1, "next", study)
  }

  return (
    <StudyInformationForm
      submitText={isEditMode ? "Update Study" : "Save and continue"}
      defaultValues={{
        title: study.title || "",
        description: study.description || "",
        startDate: study.startDate?.toISOString().split("T")[0] ?? "",
        endDate: study.endDate?.toISOString().split("T")[0] ?? "",
        sampleSize: study.sampleSize,
        payment: study.payment ?? "",
        length: study.length ?? "",
      }}
      onCancel={
        isEditMode
          ? () => {
              router.push(studyPath(studyId) as Route)
            }
          : undefined
      }
      cancelText={isEditMode ? "Cancel" : undefined}
      onSubmit={async (values) => {
        try {
          await updateStudyMutation({ id: studyId, ...values })
          toast.success(isEditMode ? "Study updated successfully!" : "General information saved")
          router.refresh() // Refresh to get updated study data
          router.push(getNavigationPath() as Route)
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "An unexpected error occurred. Please try again."
          return { [FORM_ERROR]: errorMessage }
        }
      }}
    />
  )
}
