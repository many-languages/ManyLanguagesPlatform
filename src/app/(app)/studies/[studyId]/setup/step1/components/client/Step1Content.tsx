"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import StudyForm from "../../../../components/client/StudyForm"
import { FORM_ERROR } from "@/src/app/components/Form"
import toast from "react-hot-toast"
import updateStudy from "../../../../mutations/updateStudy"
import { StudyWithRelations } from "../../../../queries/getStudy"

interface Step1ContentProps {
  study: StudyWithRelations
  studyId: number
}

export default function Step1Content({ study, studyId }: Step1ContentProps) {
  const router = useRouter()
  const [updateStudyMutation] = useMutation(updateStudy)

  return (
    <StudyForm
      formTitle=""
      submitText="Save and continue"
      defaultValues={{
        title: study.title || "",
        description: study.description || "",
        length: study.length || "",
      }}
      onSubmit={async (values) => {
        try {
          await updateStudyMutation({ id: studyId, ...values })
          toast.success("General information saved")
          router.push(`/studies/${studyId}/setup/step2`)
        } catch (err: any) {
          const errorMessage = err?.message || "An unexpected error occurred. Please try again."
          return { [FORM_ERROR]: errorMessage }
        }
      }}
    />
  )
}
