"use client"

import { useRouter, useParams } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import StudyForm from "../../../components/client/StudyForm"
import toast from "react-hot-toast"
import updateStudy from "../../../mutations/updateStudy"

export default function Step1Page() {
  const router = useRouter()
  const params = useParams()
  const studyId = Number(params.studyId)
  const [updateStudyMutation] = useMutation(updateStudy)

  return (
    <>
      <h2 className="text-lg font-semibold mb-4 text-center">Step 1 – General information</h2>
      <StudyForm
        formTitle=""
        submitText="Save and continue"
        onSubmit={async (values) => {
          try {
            // Remove JATOS file field if still present in the form definition
            await updateStudyMutation({ id: studyId, ...values })
            toast.success("General information saved")
            router.push(`/studies/${studyId}/setup/step2`)
          } catch (err: any) {
            console.error(err)
            return { FORM_ERROR: `Unexpected error: ${err.message ?? String(err)}` }
          }
        }}
      />
    </>
  )
}
