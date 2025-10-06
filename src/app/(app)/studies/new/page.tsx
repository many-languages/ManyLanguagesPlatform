"use client"

import { useRouter } from "next/navigation"
import StudyForm from "../components/StudyForm"
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
          const file = values.studyFile as File | undefined
          if (!file) return { FORM_ERROR: "A JATOS .jzip file is required" }

          // 1) Upload to JATOS via BFF
          const fd = new FormData()
          fd.append("studyFile", file, file.name)
          const jatosStudy = await fetch("/api/jatos/import", { method: "POST", body: fd }).then(
            async (r) => {
              const data = await r.json()
              if (!r.ok) throw new Error(data?.error || "Import failed")
              return data as {
                jatosStudyId: number
                jatosStudyUUID: string
                jatosFileName: string
              }
            }
          )

          // 2) Persist study (WITHOUT the file)
          const { studyFile, ...rest } = values as any
          await createStudyMutation({
            ...rest,
            jatosStudyId: jatosStudy.jatosStudyId,
            jatosStudyUUID: jatosStudy.jatosStudyUUID,
            jatosFileName: jatosStudy.jatosFileName,
          })

          router.push("/studies")
        } catch (err: any) {
          return { FORM_ERROR: `Unexpected error: ${err.message ?? String(err)}` }
        }
      }}
    />
  )
}
