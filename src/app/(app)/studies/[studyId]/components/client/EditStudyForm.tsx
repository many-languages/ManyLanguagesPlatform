"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import updateStudy from "../../../mutations/updateStudy"
import StudyForm from "../../../components/client/StudyForm"
import { FORM_ERROR } from "@/src/app/components/Form"
import { StudyWithRelations } from "../../../queries/getStudy"
import toast from "react-hot-toast"

interface EditStudyFormProps {
  study: StudyWithRelations
  studyId: number
}

export default function EditStudyForm({ study, studyId }: EditStudyFormProps) {
  const router = useRouter()
  const [updateStudyMutation] = useMutation(updateStudy)

  const defaultValues = useMemo(
    () => ({
      title: study.title,
      description: study.description ?? "",
      startDate: study.startDate?.toISOString().split("T")[0] ?? "",
      endDate: study.endDate?.toISOString().split("T")[0] ?? "",
      sampleSize: study.sampleSize,
      payment: study.payment ?? "",
      ethicalPermission: study.ethicalPermission ?? "",
      length: study.length ?? "",
    }),
    [study]
  )

  return (
    <StudyForm
      formTitle={`Edit ${study.title}`}
      submitText="Edit Study"
      defaultValues={defaultValues}
      onSubmit={async (values) => {
        try {
          await updateStudyMutation({ id: studyId, ...values })
          toast.success("Study updated successfully!")
          router.push(`/studies/${studyId}`)
        } catch (error: any) {
          const errorMessage =
            error?.message || "Sorry, we had an unexpected error. Please try again."
          return {
            [FORM_ERROR]: errorMessage,
          }
        }
      }}
      onCancel={() => {
        router.push(`/studies/${studyId}`)
      }}
    />
  )
}
