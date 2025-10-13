"use client"

import { useRouter, useParams } from "next/navigation"
import JatosForm from "../../../components/JatosForm"
import toast from "react-hot-toast"
import { useMutation } from "@blitzjs/rpc"
import importJatos from "../../../mutations/importJatos"
import updateStudyBatch from "../../../mutations/updateStudyBatch"

export default function Step2Page() {
  const router = useRouter()
  const params = useParams()
  const studyId = Number(params.id)
  const [importJatosMutation] = useMutation(importJatos)
  const [updateStudyBatchMutation] = useMutation(updateStudyBatch)

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Step 2 – JATOS setup</h2>
      <JatosForm
        formTitle=""
        submitText={"Submit"}
        onSubmit={async (values) => {
          try {
            const file = values.studyFile as File | undefined
            if (!file) return { FORM_ERROR: "A JATOS .jzip file is required" }

            // 1) Upload the .jzip to JATOS
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

            // 2) Persist JATOS data + form fields to DB
            await importJatosMutation({
              studyId,
              jatosWorkerType: values.jatosWorkerType,
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
                studyId: studyId,
                jatosBatchId,
              })
            } else {
              toast.error("No JATOS batch found for this study")
            }

            toast.success("JATOS instance created")
            router.push(`/studies/${studyId}/setup/step3`)
          } catch (err: any) {
            console.error(err)
            return { FORM_ERROR: `Unexpected error: ${err.message ?? String(err)}` }
          }
        }}
      />
    </>
  )
}
