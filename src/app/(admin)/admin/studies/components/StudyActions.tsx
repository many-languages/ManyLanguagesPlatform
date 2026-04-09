"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"
import enableDataCollection from "../mutations/enableDataCollection"
import disableDataCollection from "../mutations/disableDataCollection"
import approveStudy from "../mutations/approveStudy"
import rejectStudy from "../mutations/rejectStudy"
import deleteStudy from "../mutations/deleteStudy"
import { AdminStudyFormValues } from "../validations"
import { ConfirmButton } from "@/src/app/components/ConfirmButton"
import { isSetupComplete } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"
import type { StudyWithMinimalRelations } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"
import type { AdminStudyWithLatestUpload } from "../queries/getAdminStudies"

type StudyWithFeedbackTemplate = AdminStudyWithLatestUpload

type WithStudyActionOptions = {
  action: (ids: number[]) => Promise<{ updated: number } | null>
  successMessage: (count: number) => string
  errorMessage: string
  setLoading: (loading: boolean) => void
}

async function withStudyAction(
  watch: () => number[],
  setValue: (ids: number[]) => void,
  trigger: () => Promise<boolean>,
  router: ReturnType<typeof useRouter>,
  options: WithStudyActionOptions
): Promise<void> {
  const ids = watch()
  const valid = await trigger()
  if (!valid) return

  try {
    options.setLoading(true)
    const result = await options.action(ids)
    if (result === null) return
    toast.success(options.successMessage(result.updated))
    setValue([])
    router.refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : options.errorMessage)
  } finally {
    options.setLoading(false)
  }
}

export default function StudyActions({ studies }: { studies: StudyWithFeedbackTemplate[] }) {
  const router = useRouter()
  const { watch, setValue, trigger } = useFormContext<AdminStudyFormValues>()

  const runWithStudyAction = (options: WithStudyActionOptions) =>
    withStudyAction(
      () => watch("selectedStudyIds"),
      (ids) => setValue("selectedStudyIds", ids),
      () => trigger("selectedStudyIds"),
      router,
      options
    )

  const [enableMutation] = useMutation(enableDataCollection)
  const [disableMutation] = useMutation(disableDataCollection)
  const [approveMutation] = useMutation(approveStudy)
  const [rejectMutation] = useMutation(rejectStudy)
  const [deleteMutation] = useMutation(deleteStudy)
  const [isEnabling, setIsEnabling] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const selectedIds = watch("selectedStudyIds")
  const selectedStudies = studies.filter((s) => selectedIds.includes(s.id))

  const hasPending = selectedStudies.some((s) => s.adminApproved === null)
  const hasPendingWithSetupComplete = selectedStudies.some(
    (s) => s.adminApproved === null && isSetupComplete(s as StudyWithMinimalRelations)
  )
  const allApproved =
    selectedStudies.length > 0 && selectedStudies.every((s) => s.adminApproved === true)
  const allEnabled = selectedStudies.length > 0 && selectedStudies.every((s) => s.status === "OPEN")
  const allDisabled =
    selectedStudies.length > 0 && selectedStudies.every((s) => s.status === "CLOSED")
  const mixed = selectedStudies.length > 0 && !allEnabled && !allDisabled

  const canDelete =
    selectedStudies.length > 0 &&
    selectedStudies.every((s) => !isSetupComplete(s as StudyWithMinimalRelations) || s.archived)
  const showApproveButton = hasPendingWithSetupComplete
  const showRejectButton = hasPending
  const showDisableButton = allApproved && (allEnabled || mixed)
  const showEnableButton = allApproved && (allDisabled || mixed)

  const handleEnable = () =>
    runWithStudyAction({
      action: async (ids) => {
        const selectedStudiesToEnable = studies.filter((s) => ids.includes(s.id))
        const invalidStudies = selectedStudiesToEnable.filter(
          (s) => s.adminApproved !== true || !isSetupComplete(s as StudyWithMinimalRelations)
        )
        if (invalidStudies.length > 0) {
          const titles = invalidStudies.map((s) => s.title?.trim() || `Study #${s.id}`).join(", ")
          toast.error(
            `Cannot enable data collection. The following studies need admin approval and completed setup: ${titles}`,
            { duration: 5000 }
          )
          return null
        }
        return enableMutation({ studyIds: ids })
      },
      successMessage: (count) => `Enabled data collection for ${count} study/studies`,
      errorMessage: "Failed to enable data collection.",
      setLoading: setIsEnabling,
    })

  const handleApprove = () =>
    runWithStudyAction({
      action: async (ids) => {
        const idsToApprove = studies
          .filter(
            (s) =>
              ids.includes(s.id) &&
              s.adminApproved === null &&
              isSetupComplete(s as StudyWithMinimalRelations)
          )
          .map((s) => s.id)
        if (idsToApprove.length === 0) return null
        return approveMutation({ studyIds: idsToApprove })
      },
      successMessage: (count) => `Approved ${count} study/studies`,
      errorMessage: "Failed to approve studies.",
      setLoading: setIsApproving,
    })

  const handleReject = () =>
    runWithStudyAction({
      action: async (ids) => {
        const idsToReject = studies
          .filter((s) => ids.includes(s.id) && s.adminApproved === null)
          .map((s) => s.id)
        if (idsToReject.length === 0) return null
        return rejectMutation({ studyIds: idsToReject })
      },
      successMessage: (count) => `Rejected ${count} study/studies`,
      errorMessage: "Failed to reject studies.",
      setLoading: setIsRejecting,
    })

  const handleDisable = () =>
    runWithStudyAction({
      action: async (ids) => disableMutation({ studyIds: ids }),
      successMessage: (count) => `Disabled data collection for ${count} study/studies`,
      errorMessage: "Failed to disable data collection.",
      setLoading: setIsDisabling,
    })

  const handleDelete = () =>
    runWithStudyAction({
      action: async (ids) => {
        const invalid = studies.filter(
          (s) =>
            ids.includes(s.id) && isSetupComplete(s as StudyWithMinimalRelations) && !s.archived
        )
        if (invalid.length > 0) {
          const titles = invalid.map((s) => s.title?.trim() || `Study #${s.id}`).join(", ")
          toast.error(
            `Cannot delete. Only studies with incomplete setup or archived studies can be deleted: ${titles}`,
            { duration: 5000 }
          )
          return null
        }
        return deleteMutation({ studyIds: ids, reason: "Admin deletion from dashboard" })
      },
      successMessage: (count) => `Deleted ${count} study/studies`,
      errorMessage: "Failed to delete studies.",
      setLoading: setIsDeleting,
    })

  const isSubmitting = isEnabling || isDisabling || isApproving || isRejecting || isDeleting

  if (selectedIds.length === 0) {
    return null
  }

  return (
    <div className="flex gap-2 justify-end flex-wrap">
      {showApproveButton && (
        <button
          type="button"
          className="btn btn-success btn-outline"
          disabled={isSubmitting}
          onClick={handleApprove}
        >
          {isApproving ? "Approving..." : "Approve"}
        </button>
      )}
      {showRejectButton && (
        <button
          type="button"
          className="btn btn-error btn-outline"
          disabled={isSubmitting}
          onClick={handleReject}
        >
          {isRejecting ? "Rejecting..." : "Reject"}
        </button>
      )}
      {showDisableButton && (
        <button
          type="button"
          className="btn btn-error btn-outline"
          disabled={isSubmitting}
          onClick={handleDisable}
        >
          {isDisabling ? "Disabling..." : "Disable data collection"}
        </button>
      )}
      {showEnableButton && (
        <button
          type="button"
          className="btn btn-success btn-outline"
          disabled={isSubmitting}
          onClick={handleEnable}
        >
          {isEnabling ? "Enabling..." : "Enable data collection"}
        </button>
      )}
      {canDelete && (
        <ConfirmButton
          onConfirm={handleDelete}
          confirmMessage="This will permanently delete the selected study/studies from the database and JATOS. All related data will be removed. This cannot be undone. Continue?"
          loadingText="Deleting"
          className="btn btn-error"
          disabled={isSubmitting}
        >
          Delete study
        </ConfirmButton>
      )}
    </div>
  )
}
