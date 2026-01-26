"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@blitzjs/auth"
import { useStudySetup } from "../../../components/client/StudySetupProvider"
import JatosForm from "./JatosForm"
import toast from "react-hot-toast"
import { useMutation } from "@blitzjs/rpc"
import importJatos from "../../../mutations/importJatos"
import updateStudyBatch from "../../../../../mutations/updateStudyBatch"
import clearJatosData from "../../../../../mutations/clearJatosData"
import updateSetupCompletion from "../../../mutations/updateSetupCompletion"
import fetchJatosBatchId from "@/src/lib/jatos/api/fetchJatosBatchId"
import deleteExistingJatosStudy from "@/src/lib/jatos/api/deleteExistingJatosStudy"
import { uploadStudyFile } from "@/src/lib/jatos/api/uploadStudyFile"
import { Alert } from "@/src/app/components/Alert"
import { FORM_ERROR } from "@/src/app/components/Form"
import { generateAndSaveResearcherPilotRunUrl } from "../../../../utils/generateResearcherPilotRunUrl"

export default function Step2Content() {
  const router = useRouter()
  const { study } = useStudySetup()
  const { userId } = useSession()
  const [importJatosMutation] = useMutation(importJatos)
  const [updateStudyBatchMutation] = useMutation(updateStudyBatch)
  const [clearJatosDataMutation] = useMutation(clearJatosData)
  const [updateSetupCompletionMutation] = useMutation(updateSetupCompletion)
  const latestUpload = study.latestJatosStudyUpload

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
      studyId: study.id,
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
      await updateStudyBatchMutation({ studyId: study.id, jatosBatchId } as any)
    } else {
      toast.error("No JATOS batch found for this study")
      setLoading(false)
      return false
    }

    // 3️⃣ Mark step 2 as complete
    try {
      await updateSetupCompletionMutation({
        studyId: study.id,
        step2Completed: true,
      })
      router.refresh() // Refresh to get updated study data
    } catch (err) {
      console.error("Failed to update step 2 completion:", err)
      // Don't fail the whole import if this fails, but log it
    }

    // 4️⃣ Auto-generate pilot link for the current researcher
    try {
      const researcher = study.researchers?.find((r) => r.userId === userId)
      if (researcher?.id && jatosBatchId) {
        await generateAndSaveResearcherPilotRunUrl({
          studyResearcherId: researcher.id,
          jatosStudyId: uploadResult.jatosStudyId,
          jatosBatchId: jatosBatchId,
        })
        // Silent success - test link generated automatically
      }
    } catch (err) {
      console.error("Failed to auto-generate pilot link:", err)
      // Don't fail the import if pilot link generation fails - user can generate it manually in Step 3
    }

    // 5️⃣ Success
    toast.success("JATOS instance created")
    router.push(`/studies/${study.id}/setup/step3`)
    // Refresh after navigation to ensure fresh data is loaded
    router.refresh()
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
      await clearJatosDataMutation({ studyId: study.id } as any)

      toast.success("Old JATOS study deleted")

      // 3️⃣ Re-upload to JATOS
      setLoading(true)
      const uploadResult = await uploadStudyFile(duplicateAlert.file)

      // If conflict, this shouldn't happen after deletion, but handle it
      if ("studyExists" in uploadResult && uploadResult.studyExists) {
        throw new Error("Study still exists after deletion. Please try again.")
      }

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
      jatosWorkerType: (latestUpload?.jatosWorkerType || "SINGLE") as "SINGLE" | "MULTIPLE",
      jatosFileName: latestUpload?.jatosFileName || undefined,
    }),
    [latestUpload?.jatosWorkerType, latestUpload?.jatosFileName]
  )

  return (
    <>
      {duplicateAlert && (
        <Alert variant="warning" className="mb-6" role="alert">
          <div className="flex justify-between items-center w-full">
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
        </Alert>
      )}

      <JatosForm
        submitText="Save and continue"
        cancelText="Back"
        onCancel={() => router.push(`/studies/${study.id}/setup/step1`)}
        actionsClassName="justify-between"
        defaultValues={defaultValues}
        onSubmit={async (values) => {
          const file = values.studyFile as File | undefined
          if (!file) {
            return { [FORM_ERROR]: "A JATOS .jzip file is required" }
          }

          setLoading(true)

          try {
            // 1️⃣ Upload to JATOS
            const uploadResult = await uploadStudyFile(file)

            // Handle existing study (409 conflict)
            if ("studyExists" in uploadResult && uploadResult.studyExists) {
              // 2️⃣ Show duplicate alert
              setDuplicateAlert({
                uuid: uploadResult.jatosStudyUUID,
                studyId: uploadResult.jatosStudyId,
                file: file,
                jatosWorkerType: values.jatosWorkerType,
                title: uploadResult.currentStudyTitle!,
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
