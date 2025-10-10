"use client"

import { useRouter } from "next/navigation"
import StudyForm from "../components/StudyForm"
import { useMutation } from "@blitzjs/rpc"
import createStudy from "../mutations/createStudy"
import toast from "react-hot-toast"
import updateStudyBatch from "../mutations/updateStudyBatch"

export default function NewStudy() {
  const router = useRouter()
  const [createStudyMutation] = useMutation(createStudy)
  const [updateStudyBatchMutation] = useMutation(updateStudyBatch)

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
          const study = await createStudyMutation({
            ...rest,
            jatosStudyId: jatosStudy.jatosStudyId,
            jatosStudyUUID: jatosStudy.jatosStudyUUID,
            jatosFileName: jatosStudy.jatosFileName,
          })

          // 3) Fetch JATOS properties to get the batchId
          const res = await fetch(
            `/api/jatos/get-study-properties?studyId=${jatosStudy.jatosStudyUUID}`
          )
          const json = await res.json()
          if (!res.ok) throw new Error(json.error || "Failed to fetch JATOS properties")

          const batches = json?.data?.batches ?? []
          const jatosBatchId = batches.length > 0 ? batches[0].id : null

          // 4) Update the study in the DB with jatosBatchId
          if (jatosBatchId) {
            await updateStudyBatchMutation({
              studyId: study.id,
              jatosBatchId,
            })
          } else {
            toast.error("No JATOS batch found for this study")
          }

          toast.success("Study created successfully")
          router.push("/studies")
        } catch (err: any) {
          console.error(err)
          return { FORM_ERROR: `Unexpected error: ${err.message ?? String(err)}` }
        }
      }}
    />
  )
}
