"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"

import JatosForm from "./JatosForm"
import toast from "react-hot-toast"
import { useMutation } from "@blitzjs/rpc"
import checkJatosStudyUuid from "@/src/features/studies/mutations/checkJatosStudyUuid"
import updateJatosUploadWorkerType from "@/src/features/studies/mutations/updateJatosUploadWorkerType"
import { completeStep2ImportAction } from "@/src/features/studies/actions/completeStep2Import"
import { uploadStudyFile } from "@/src/lib/jatos/browser/uploadStudyFile"
import { extractJatosStudyUuidFromJzip } from "@/src/lib/jatos/parsers/extractJatosStudyUuid"
import { Alert } from "@/src/components/ui/Alert"
import { FORM_ERROR } from "@/src/components/ui/Form"

import type { StudyWithRelations } from "../../../../types"
import { studySetupStepPath } from "../../../../domain/setup/setupRoutes"

interface Step2ContentProps {
  study: StudyWithRelations
}

export default function Step2Content({ study }: Step2ContentProps) {
  const router = useRouter()
  const [checkJatosStudyUuidMutation] = useMutation(checkJatosStudyUuid)
  const [updateJatosUploadWorkerTypeMutation] = useMutation(updateJatosUploadWorkerType)
  const latestUpload = study.latestJatosStudyUpload

  const [updateAlert, setUpdateAlert] = useState<{
    uuid: string
    file: File
    jatosWorkerType: "SINGLE" | "MULTIPLE"
  } | null>(null)
  const [loading, setLoading] = useState(false)

  // Route already did JATOS upload + DB + membership sync; finalise batch ID, step flag, and pilot link server-side.
  async function completeImport(
    uploadResult: {
      jatosStudyId: number
      jatosStudyUUID: string
      latestUpload?: { id: number }
    },
    options?: { successToast?: string }
  ): Promise<boolean> {
    const result = await completeStep2ImportAction({
      studyId: study.id,
      jatosStudyId: uploadResult.jatosStudyId,
      jatosStudyUUID: uploadResult.jatosStudyUUID,
      latestUploadId: uploadResult.latestUpload?.id ?? null,
    })

    if (!result.ok) {
      toast.error(result.error)
      setLoading(false)
      return false
    }

    toast.success(options?.successToast ?? "JATOS instance created")
    router.push(studySetupStepPath(study.id, 3) as Route)
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
      })) as { success: boolean; error?: string }
      if (!preflight.success) {
        toast.error(preflight.error || "Unable to verify JATOS study")
        setLoading(false)
        return
      }
      const uploadResult = await uploadStudyFile(updateAlert.file, {
        studyId: study.id,
        jatosWorkerType: updateAlert.jatosWorkerType,
      })
      const success = await completeImport(uploadResult)
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
        onCancel={() => router.push(studySetupStepPath(study.id, 1) as Route)}
        defaultValues={defaultValues}
        currentStudyFileUploadedAt={latestUpload?.createdAt}
        jatosStudyUuid={study.jatosStudyUUID}
        onSubmit={async (values) => {
          const file = values.studyFile as File | undefined

          const existingJatosStudyUuid = study.jatosStudyUUID
          const canContinueWithoutNewFile =
            !file &&
            !!existingJatosStudyUuid &&
            latestUpload != null &&
            latestUpload.jatosStudyId != null

          if (canContinueWithoutNewFile) {
            try {
              setLoading(true)
              await updateJatosUploadWorkerTypeMutation({
                studyId: study.id,
                jatosWorkerType: values.jatosWorkerType,
              })
              await completeImport(
                {
                  jatosStudyId: latestUpload.jatosStudyId,
                  jatosStudyUUID: existingJatosStudyUuid,
                  latestUpload: { id: latestUpload.id },
                },
                { successToast: "Setup saved" }
              )
            } catch (err: any) {
              toast.error(err?.message ?? "Failed to continue")
              setLoading(false)
            }
            return
          }

          if (!file) {
            return {
              [FORM_ERROR]: latestUpload?.jatosFileName
                ? "Please choose a .jzip file to continue. You can select the same export again from your computer — the name shown above is what we already imported."
                : "A JATOS .jzip file is required",
            }
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
            })) as { success: boolean; error?: string }

            if (!preflight.success) {
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

            // 1️⃣ Upload to JATOS + DB + membership (route does it all)
            const uploadResult = await uploadStudyFile(file, {
              studyId: study.id,
              jatosWorkerType: values.jatosWorkerType,
            })

            // 2️⃣ Complete import (batch ID + setup completion + pilot link + navigate)
            await completeImport(uploadResult)
          } catch (err: any) {
            toast.error("Failed to upload file")
            setLoading(false)
            return { [FORM_ERROR]: `Upload error: ${err.message}` }
          }
        }}
      />
    </>
  )
}
