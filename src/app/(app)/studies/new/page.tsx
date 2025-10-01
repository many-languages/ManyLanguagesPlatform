"use client"

import { useRouter } from "next/navigation"
import StudyForm from "../components/StudyForm"
import { FORM_ERROR } from "@/src/app/components/Form"
import { useMutation } from "@blitzjs/rpc"
import createStudy from "../mutations/createStudy"
import toast from "react-hot-toast"

export default function NewStudy() {
  const router = useRouter()
  const [createStudyMutation] = useMutation(createStudy)

  return (
    <StudyForm
      formTitle="Create a new study"
      submitText="Create study"
      onSubmit={async (values) => {
        try {
          await toast.promise(createStudyMutation(values), {
            loading: "Creating study...",
            success: "Study created successfully!",
            error: "Failed to create study",
          })
          router.push("/studies")
        } catch (error: any) {
          if (error.name === "ZodError") {
            return error.formErrors.fieldErrors
          }
          return {
            [FORM_ERROR]: "Sorry, unexpected error: " + error.toString(),
          }
        }
      }}
      onCancel={() => {
        router.push("/studies")
      }}
    />
  )
}
