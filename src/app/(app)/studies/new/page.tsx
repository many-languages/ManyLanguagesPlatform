"use client"

import { useRouter } from "next/navigation"
import StudyForm from "../components/StudyForm"
import { useMutation } from "@blitzjs/rpc"
import createStudy from "../mutations/createStudy"
import toast from "react-hot-toast"
import importStudy from "../mutations/importStudy"

export default function NewStudy() {
  const router = useRouter()
  const [createStudyMutation] = useMutation(createStudy)
  const [importStudyMutation] = useMutation(importStudy)

  return (
    <StudyForm
      formTitle="Create a new study"
      submitText="Create study"
      onSubmit={async (values) => {
        try {
          const file = values.studyFile as File
          if (!file) {
            return { studyFile: "A JATOS .jzip file is required" }
          }

          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const jatos = await toast.promise(importStudyMutation({ buffer, filename: file.name }), {
            loading: "Importing study to JATOS...",
            success: "JATOS import successful",
            error: "Failed to import into JATOS",
          })

          await toast.promise(
            createStudyMutation({
              ...values,
              jatosStudyId: jatos.jatosStudyId,
              jatosUUID: jatos.jatosUUID,
              jatosFileName: jatos.jatosFileName,
            }),
            {
              loading: "Creating study...",
              success: "Study created successfully!",
              error: "Failed to create study",
            }
          )

          router.push("/studies")
        } catch (error: any) {
          if (error.name === "ZodError") {
            return error.formErrors.fieldErrors
          }
          return { FORM_ERROR: "Sorry, unexpected error: " + error.toString() }
        }
      }}
    />
  )
}
