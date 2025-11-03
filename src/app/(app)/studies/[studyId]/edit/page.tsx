"use client"

import { useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { useMutation, useQuery } from "@blitzjs/rpc"
import getStudy from "../../queries/getStudy"
import updateStudy from "../../mutations/updateStudy"
import StudyForm from "../../components/client/StudyForm"
import { FORM_ERROR } from "@/src/app/components/Form"
import StudyFormSkeleton from "../../components/skeletons/StudyFormSkeleton"
import toast from "react-hot-toast"

export default function EditStudy() {
  const router = useRouter()
  const params = useParams()
  const studyId = Number(params.studyId)
  const [updateStudyMutation] = useMutation(updateStudy)

  // Fetch the study to edit
  const [study, { isLoading, error }] = useQuery(getStudy, { id: studyId })

  if (isLoading) return <StudyFormSkeleton />
  if (error) {
    toast.error("Could not load study")
    return <StudyFormSkeleton />
  }

  if (!study) {
    toast.error("Study not found")
    return <StudyFormSkeleton />
  }

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
    <main>
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
    </main>
  )
}
