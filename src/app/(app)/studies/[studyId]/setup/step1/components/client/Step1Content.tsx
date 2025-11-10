"use client"

import { Route } from "next"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import { FORM_ERROR } from "@/src/app/components/Form"
import toast from "react-hot-toast"
import { useStudySetup } from "../../../components/client/StudySetupProvider"
import updateStudy from "@/src/app/(app)/studies/mutations/updateStudy"
import StudyInformationForm from "@/src/app/(app)/studies/components/client/StudyInformationForm"
import { getPostStepNavigationUrl } from "../../../utils/setupStatus"

interface Step1ContentProps {
  isEditMode?: boolean
  returnTo?: string
}

export default function Step1Content({
  isEditMode = false,
  returnTo = "step2",
}: Step1ContentProps) {
  const router = useRouter()
  const { study, studyId } = useStudySetup()
  const [updateStudyMutation] = useMutation(updateStudy)

  // Parse returnTo and get navigation URL
  const getNavigationPath = (): string => {
    if (returnTo === "study") {
      return getPostStepNavigationUrl(studyId, 1, "study")
    }
    if (returnTo?.startsWith("step")) {
      const stepNum = parseInt(returnTo.replace("step", ""), 10)
      if (!isNaN(stepNum) && stepNum >= 1 && stepNum <= 4) {
        return getPostStepNavigationUrl(studyId, 1, stepNum, study)
      }
    }
    // Default to next step
    return getPostStepNavigationUrl(studyId, 1, "next", study)
  }

  return (
    <StudyInformationForm
      formTitle={isEditMode ? `Edit ${study.title || "Study"}` : ""}
      submitText={isEditMode ? "Update Study" : "Save and continue"}
      actionsClassName="justify-between"
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
              router.push(`/studies/${studyId}` as Route)
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
        } catch (err: any) {
          const errorMessage = err?.message || "An unexpected error occurred. Please try again."
          return { [FORM_ERROR]: errorMessage }
        }
      }}
    />
  )
}
