"use client"

import { useRouter } from "next/navigation"
import StudyForm from "../components/StudyForm"
import { FORM_ERROR } from "@/src/app/components/Form"
import { useMutation } from "@blitzjs/rpc"
import createStudy from "../mutations/createStudy"

export default function NewStudy() {
  const router = useRouter()
  const [createStudyMutation] = useMutation(createStudy)

  return (
    <StudyForm
      formTitle="Create a new study"
      submitText="Create study"
      onSubmit={async (values) => {
        try {
          await createStudyMutation(values)
          router.push("/studies")
        } catch (error: any) {
          return {
            [FORM_ERROR]:
              "Sorry, we had an unexpected error. Please try again. - " + error.toString(),
          }
        }
      }}
      onCancel={() => {
        router.push("/studies")
      }}
    />
  )
}
