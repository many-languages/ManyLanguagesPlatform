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
import archiveStudy from "@/src/app/(app)/studies/mutations/archiveStudy"
import unarchiveStudy from "@/src/app/(app)/studies/mutations/unarchiveStudy"
import { AdminStudyFormValues } from "../validations"
import { ConfirmButton } from "@/src/app/components/ConfirmButton"
import { isSetupComplete } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"
import type { StudyWithMinimalRelations } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"
import type { AdminStudyWithLatestUpload } from "../queries/getAdminStudies"
import type { UserRole } from "@/db"
import { isSuperAdmin } from "@/src/lib/auth/roles"

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

export default function StudyActions({
  studies,
  viewerRole,
}: {
  studies: StudyWithFeedbackTemplate[]
  viewerRole: UserRole
}) {
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
  const [archiveMutation] = useMutation(archiveStudy)
  const [unarchiveMutation] = useMutation(unarchiveStudy)
  const [isEnabling, setIsEnabling] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isUnarchiving, setIsUnarchiving] = useState(false)

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

  /** Archive only when every selected study has real participant responses and is not already archived. */
  const showArchiveButton =
    selectedStudies.length > 0 &&
    selectedStudies.every((s) => !s.archived && s.hasParticipantResponses === true)
  /** Unarchive when every selected study is archived (same idea as researcher StudyLifecycleActions). */
  const allArchived = selectedStudies.length > 0 && selectedStudies.every((s) => s.archived)
  const showUnarchiveButton = allArchived
  const superadmin = isSuperAdmin(viewerRole)

  /** Non–super-admins cannot delete archived studies that have responses; hide Delete entirely so it is not shown disabled. */
  const hideDeleteForStaffAdmin =
    !superadmin && selectedStudies.some((s) => s.hasParticipantResponses === true && s.archived)

  const deleteDisabledReason =
    selectedStudies.length === 0
      ? null
      : selectedStudies.some((s) => s.hasParticipantResponses === null)
      ? "Could not verify participant response data. Try again later."
      : selectedStudies.some((s) => s.hasParticipantResponses === true && !s.archived)
      ? "Studies with participant responses must be archived before they can be deleted. Adjust your selection."
      : null

  const deleteEnabled =
    selectedStudies.length > 0 && !hideDeleteForStaffAdmin && deleteDisabledReason === null

  const deleteConfirmMessage =
    superadmin && selectedStudies.some((s) => s.archived)
      ? "This will permanently remove the selected archived study/studies from the platform and JATOS. All related data will be lost. Before continuing, confirm that study materials and results are copied to a long-term archive (for example Zenodo). This cannot be undone. Continue?"
      : "This will permanently delete the selected study/studies from the database and JATOS. This cannot be undone. Continue?"

  const showApproveButton = hasPendingWithSetupComplete
  const showRejectButton = hasPending
  const showDisableButton = allApproved && (allEnabled || mixed) && !allArchived
  const showEnableButton = allApproved && (allDisabled || mixed) && !allArchived

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
      action: async (ids) =>
        deleteMutation({ studyIds: ids, reason: "Admin deletion from dashboard" }),
      successMessage: (count) => `Deleted ${count} study/studies`,
      errorMessage: "Failed to delete studies.",
      setLoading: setIsDeleting,
    })

  const handleArchive = () =>
    runWithStudyAction({
      action: async (ids) => {
        const targets = studies.filter((s) => ids.includes(s.id) && !s.archived)
        if (targets.length === 0) return null
        for (const s of targets) {
          await archiveMutation({ id: s.id })
        }
        return { updated: targets.length }
      },
      successMessage: (count) => `Archived ${count} study/studies`,
      errorMessage: "Failed to archive studies.",
      setLoading: setIsArchiving,
    })

  const handleUnarchive = () =>
    runWithStudyAction({
      action: async (ids) => {
        const targets = studies.filter((s) => ids.includes(s.id) && s.archived)
        if (targets.length === 0) return null
        for (const s of targets) {
          await unarchiveMutation({ id: s.id })
        }
        return { updated: targets.length }
      },
      successMessage: (count) => `Unarchived ${count} study/studies`,
      errorMessage: "Failed to unarchive studies.",
      setLoading: setIsUnarchiving,
    })

  const isSubmitting =
    isEnabling ||
    isDisabling ||
    isApproving ||
    isRejecting ||
    isDeleting ||
    isArchiving ||
    isUnarchiving

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
      {showArchiveButton && (
        <ConfirmButton
          onConfirm={handleArchive}
          confirmMessage="Selected studies will be archived (not permanently deleted). Continue?"
          loadingText="Archiving"
          className="btn btn-warning"
          disabled={isSubmitting}
        >
          Archive study
        </ConfirmButton>
      )}
      {showUnarchiveButton && (
        <ConfirmButton
          onConfirm={handleUnarchive}
          confirmMessage="Selected studies will be restored (active again in lists). Continue?"
          loadingText="Unarchiving"
          className="btn btn-success"
          disabled={isSubmitting}
        >
          Unarchive
        </ConfirmButton>
      )}
      {selectedStudies.length > 0 &&
        !hideDeleteForStaffAdmin &&
        (deleteEnabled ? (
          <ConfirmButton
            onConfirm={handleDelete}
            confirmMessage={deleteConfirmMessage}
            loadingText="Deleting"
            className="btn btn-error"
            disabled={isSubmitting}
          >
            Delete study
          </ConfirmButton>
        ) : (
          <span
            className="tooltip tooltip-top before:max-w-sm"
            data-tip={deleteDisabledReason ?? ""}
          >
            <button
              type="button"
              className="btn btn-error btn-disabled"
              disabled
              aria-disabled="true"
            >
              Delete study
            </button>
          </span>
        ))}
    </div>
  )
}
