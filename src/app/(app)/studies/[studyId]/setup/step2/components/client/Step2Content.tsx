"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@blitzjs/auth"

import JatosForm from "./JatosForm"
import toast from "react-hot-toast"
import { useMutation } from "@blitzjs/rpc"
import importJatos from "../../../mutations/importJatos"
import checkJatosStudyUuid from "../../../mutations/checkJatosStudyUuid"
import updateStudyBatch from "../../../../../mutations/updateStudyBatch"
import updateSetupCompletion from "../../../mutations/updateSetupCompletion"
import fetchJatosBatchId from "@/src/lib/jatos/api/fetchJatosBatchId"
import { uploadStudyFile } from "@/src/lib/jatos/api/uploadStudyFile"
import { extractJatosStudyUuidFromJzip } from "@/src/lib/jatos/api/extractJatosStudyUuid"
import { Alert } from "@/src/app/components/Alert"
import { FORM_ERROR } from "@/src/app/components/Form"
import { generateAndSaveResearcherPilotRunUrl } from "../../../../utils/generateResearcherPilotRunUrl"

import { StudyWithRelations } from "@/src/app/(app)/studies/queries/getStudy"

interface Step2ContentProps {
  study: StudyWithRelations
}

export default function Step2Content({ study }: Step2ContentProps) {
  const router = useRouter()
  // const { study } = useStudySetup()
  const { userId } = useSession()
  const [importJatosMutation] = useMutation(importJatos)
  const [checkJatosStudyUuidMutation] = useMutation(checkJatosStudyUuid)
  const [updateStudyBatchMutation] = useMutation(updateStudyBatch)
  const [updateSetupCompletionMutation] = useMutation(updateSetupCompletion)
  const latestUpload = study.latestJatosStudyUpload

  const [updateAlert, setUpdateAlert] = useState<{
    uuid: string
    file: File
    jatosWorkerType: "SINGLE" | "MULTIPLE"
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
      buildHash: uploadResult.buildHash,
      hashAlgorithm: uploadResult.hashAlgorithm,
    } as any)) as {
      study?: any
      latestUpload?: { id: number }
      error?: string
      jatosStudyUUID?: string
    }

    if (dbResult?.error) {
      toast.error(dbResult.error)
      setLoading(false)
      return false
    }
    const latestUploadId = dbResult?.latestUpload?.id ?? null

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
      if (researcher?.id && jatosBatchId && latestUploadId) {
        await generateAndSaveResearcherPilotRunUrl({
          studyId: study.id,
          studyResearcherId: researcher.id,
          jatosStudyUploadId: latestUploadId,
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

  async function handleUpdateConfirm() {
    if (!updateAlert) return

    try {
      setLoading(true)
      const preflight = (await checkJatosStudyUuidMutation({
        studyId: study.id,
        jatosStudyUUID: updateAlert.uuid,
        mode: "update",
      })) as { ok: boolean; error?: string }
      if (!preflight.ok) {
        toast.error(preflight.error || "Unable to verify JATOS study")
        setLoading(false)
        return
      }
      const uploadResult = await uploadStudyFile(updateAlert.file)
      const success = await completeImport(uploadResult, updateAlert.jatosWorkerType)
      if (success) {
        setUpdateAlert(null)
      }
    } catch (err: any) {
      toast.error(`Failed to update study: ${err.message}`)
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
      {updateAlert && (
        <Alert variant="warning" className="mb-6" role="alert">
          <div className="flex justify-between items-center w-full">
            <div>
              <span className="font-semibold">
                This will update the existing JATOS study <code>{updateAlert.uuid}</code>.
              </span>
              <p className="text-sm opacity-80">
                You will need to re-run any existing pilot runs after updating.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-warning btn-sm" onClick={handleUpdateConfirm}>
                Update study
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setUpdateAlert(null)}>
                Cancel
              </button>
            </div>
          </div>
        </Alert>
      )}

      <JatosForm
        submitText="Save and continue"
        cancelText="Back"
        onCancel={() => router.push(`/studies/${study.id}/setup/step1`)}
        defaultValues={defaultValues}
        onSubmit={async (values) => {
          const file = values.studyFile as File | undefined
          if (!file) {
            return { [FORM_ERROR]: "A JATOS .jzip file is required" }
          }

          try {
            setLoading(true)
            const extractedUuid = await extractJatosStudyUuidFromJzip(file)
            if (!extractedUuid) {
              setLoading(false)
              return { [FORM_ERROR]: "Unable to read JATOS UUID from the .jzip file" }
            }

            if (study.jatosStudyUUID && study.jatosStudyUUID !== extractedUuid) {
              setLoading(false)
              return {
                [FORM_ERROR]:
                  "This JATOS study does not match the current study. Please create a new study instead.",
              }
            }

            const preflight = (await checkJatosStudyUuidMutation({
              studyId: study.id,
              jatosStudyUUID: extractedUuid,
              mode: study.jatosStudyUUID ? "update" : "create",
            })) as { ok: boolean; error?: string }

            if (!preflight.ok) {
              setLoading(false)
              return { [FORM_ERROR]: preflight.error || "Unable to verify JATOS study" }
            }

            if (study.jatosStudyUUID && study.jatosStudyUUID === extractedUuid) {
              setUpdateAlert({
                uuid: extractedUuid,
                file,
                jatosWorkerType: values.jatosWorkerType,
              })
              setLoading(false)
              return
            }

            // 1️⃣ Upload to JATOS
            const uploadResult = await uploadStudyFile(file)

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
