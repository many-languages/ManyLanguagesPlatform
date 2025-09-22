"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@blitzjs/rpc"
import getStudy from "../../queries/getStudy"
import updateStudy from "../../mutations/updateStudy"
import StudyForm from "../../components/StudyForm"
import { FORM_ERROR } from "src/app/components/Form"

export default function EditStudy({ params }: { params: { studyId: string } }) {
  const router = useRouter()
  const studyId = Number(params.studyId)
  const [updateStudyMutation] = useMutation(updateStudy)

  // Fetch the study to edit
  const [study] = useQuery(getStudy, { id: studyId })

  if (!study) {
    return <div className="flex justify-center items-center">Loading...</div>
  }

  return (
    <main>
      <StudyForm
        formTitle={`Edit ${study?.title}`}
        submitText="Edit Study"
        initialValues={{
          title: study.title,
          description: study.description ?? "",
          startDate: study.startDate?.toISOString().split("T")[0] ?? "",
          endDate: study.endDate?.toISOString().split("T")[0] ?? "",
          sampleSize: study.sampleSize,
          payment: study.payment ?? "",
          ethicalPermission: study.ethicalPermission ?? "",
          length: study.length ?? "",
        }}
        onSubmit={async (values) => {
          try {
            await updateStudyMutation({ id: studyId, ...values })
            router.push(`/studies/${studyId}`)
          } catch (error: any) {
            console.error(error)
            return {
              [FORM_ERROR]:
                "Sorry, we had an unexpected error. Please try again. - " + error.toString(),
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
