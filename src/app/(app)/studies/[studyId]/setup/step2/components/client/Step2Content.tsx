"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import JatosForm from "./JatosForm"
import toast from "react-hot-toast"
import { useMutation } from "@blitzjs/rpc"
import importJatos from "../../../mutations/importJatos"
import updateStudyBatch from "../../../../../mutations/updateStudyBatch"
import clearJatosData from "../../../../../mutations/clearJatosData"
import uploadJatosFile from "@/src/lib/jatos/api/uploadJatosFile"
import fetchJatosBatchId from "@/src/lib/jatos/api/fetchJatosBatchId"
import deleteExistingJatosStudy from "@/src/lib/jatos/api/deleteExistingJatosStudy"
import { FORM_ERROR } from "@/src/app/components/Form"
import { StudyWithRelations } from "../../../../../queries/getStudy"

interface Step2ContentProps {
  study: StudyWithRelations
  studyId: number
}

export default function Step2Content({ study, studyId }: Step2ContentProps) {
  const router = useRouter()
  const [importJatosMutation] = useMutation(importJatos)
  const [updateStudyBatchMutation] = useMutation(updateStudyBatch)
  const [clearJatosDataMutation] = useMutation(clearJatosData)

  const [duplicateAlert, setDuplicateAlert] = useState<{
    uuid: string
    studyId: number
    file: File
    jatosWorkerType: "SINGLE" | "MULTIPLE"
    title: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  // Helper function to complete the import after upload
  async function completeImport(uploadResult: any, jatosWorkerType: string) {
    // 1️⃣ Save to DB
    const dbResult = (await importJatosMutation({
      studyId,
      jatosWorkerType: jatosWorkerType as "SINGLE" | "MULTIPLE",
      jatosStudyId: uploadResult.jatosStudyId,
      jatosStudyUUID: uploadResult.jatosStudyUUID,
      jatosFileName: uploadResult.jatosFileName,
    } as any)) as { study?: any; error?: string; jatosStudyUUID?: string }

    if (dbResult?.error) {
      toast.error(dbResult.error)
      setLoading(false)
      return false
    }

    // 2️⃣ Get batch ID
    const jatosBatchId = await fetchJatosBatchId(uploadResult.jatosStudyUUID)
    if (jatosBatchId) {
      await updateStudyBatchMutation({ studyId, jatosBatchId } as any)
    } else {
      toast.error("No JATOS batch found for this study")
    }

    // 3️⃣ Success
    toast.success("JATOS instance created")
    router.push(`/studies/${studyId}/setup/step3`)
    return true
  }

  /**
   * Handles delete + re-upload
   */
  async function handleOverwrite() {
    if (!duplicateAlert) return

    try {
      // 1️⃣ Delete from JATOS
      await deleteExistingJatosStudy(duplicateAlert.uuid)

      // 2️⃣ Clear DB record
      await clearJatosDataMutation({ studyId } as any)

      toast.success("Old JATOS study deleted")

      // 3️⃣ Re-upload to JATOS
      setLoading(true)
      const uploadResult = await uploadJatosFile(duplicateAlert.file)

      // 4️⃣ Complete import (reuse same logic)
      const success = await completeImport(uploadResult, duplicateAlert.jatosWorkerType)

      if (success) {
        setDuplicateAlert(null)
      }
    } catch (err: any) {
      toast.error(`Failed to overwrite: ${err.message}`)
      setLoading(false)
    }
  }

  const defaultValues = useMemo(
    () => ({
      jatosWorkerType: (study?.jatosWorkerType || "SINGLE") as "SINGLE" | "MULTIPLE",
      jatosFileName: study?.jatosFileName || undefined,
    }),
    [study?.jatosWorkerType, study?.jatosFileName]
  )

  return (
    <>
      {duplicateAlert && (
        <div role="alert" className="alert alert-warning mb-6 flex justify-between items-center">
          <div>
            <span className="font-semibold">
              A study with UUID <code>{duplicateAlert.uuid}</code> already exists.
            </span>
            <p className="text-sm opacity-80">
              <strong>Existing study:</strong> {duplicateAlert.title}
            </p>
            <p className="text-sm opacity-80">
              Would you like to delete the old study on JATOS and re-upload this one?
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-error btn-sm" onClick={handleOverwrite}>
              Delete & Re-upload
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setDuplicateAlert(null)}>
              Keep old study
            </button>
          </div>
        </div>
      )}

      {/* Save & Exit button */}
      <div className="mb-4">
        <button className="btn btn-ghost" onClick={() => router.push(`/studies/${studyId}`)}>
          ← Save & Exit Setup
        </button>
      </div>

      <JatosForm
        formTitle=""
        submitText="Save and continue"
        cancelText="Back"
        onCancel={() => router.push(`/studies/${studyId}/setup/step1`)}
        defaultValues={defaultValues}
        onSubmit={async (values) => {
          const file = values.studyFile as File | undefined
          if (!file) {
            return { [FORM_ERROR]: "A JATOS .jzip file is required" }
          }

          setLoading(true)

          try {
            // 1️⃣ Upload to JATOS
            const uploadResult = await uploadJatosFile(file)

            // 2️⃣ Check if study exists
            if (uploadResult.studyExists) {
              setDuplicateAlert({
                uuid: uploadResult.jatosStudyUUID,
                studyId: uploadResult.jatosStudyId,
                file: file,
                jatosWorkerType: values.jatosWorkerType,
                title: uploadResult.currentStudyTitle,
              })
              setLoading(false)
              return
            }

            // 3️⃣ Complete import (DB + batch ID + navigate)
            await completeImport(uploadResult, values.jatosWorkerType)
          } catch (err: any) {
            console.error("Upload error:", err)
            toast.error("Failed to upload file")
            setLoading(false)
            return { [FORM_ERROR]: `Upload error: ${err.message}` }
          }
        }}
      />
    </>
  )
}
