"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"
import enableDataCollection from "@/src/features/studies/mutations/enableDataCollection"
import disableDataCollection from "@/src/features/studies/mutations/disableDataCollection"
import approveStudy from "@/src/features/studies/mutations/approveStudy"
import rejectStudy from "@/src/features/studies/mutations/rejectStudy"
import deleteStudy from "@/src/features/studies/mutations/deleteStudy"
import archiveStudy from "@/src/features/studies/mutations/archiveStudy"
import unarchiveStudy from "@/src/features/studies/mutations/unarchiveStudy"
import { AdminStudyFormValues } from "@/src/features/studies/validations"
import { ConfirmButton } from "@/src/components/ui/ConfirmButton"
import { isSetupComplete, toSetupStatusStudy } from "../../domain/setup/setupStatus"
import type { AdminStudyListItemDto } from "../../types"
import type { UserRole } from "@/db"
import { isSuperAdmin } from "@/src/lib/auth/roles"
import { getAdminStudyBulkActions } from "../../domain/adminStudyBulkActions"

type ActionKey = "enable" | "disable" | "approve" | "reject" | "delete" | "archive" | "unarchive"

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
  studies: AdminStudyListItemDto[]
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
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null)

  const selectedIds = watch("selectedStudyIds")
  const selectedStudies = studies.filter((s) => selectedIds.includes(s.id))

  const {
    showApproveButton,
    showRejectButton,
    showEnableButton,
    showDisableButton,
    showArchiveButton,
    showUnarchiveButton,
    hideDeleteForStaffAdmin,
    deleteEnabled,
    deleteDisabledReason,
    deleteConfirmMessage,
  } = getAdminStudyBulkActions(selectedStudies, viewerRole)

  const handleEnable = () =>
    runWithStudyAction({
      action: async (ids) => {
        const selectedStudiesToEnable = studies.filter((s) => ids.includes(s.id))
        const invalidStudies = selectedStudiesToEnable.filter(
          (s) => s.adminApproved !== true || !isSetupComplete(toSetupStatusStudy(s))
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
      setLoading: (v) => setActiveAction(v ? "enable" : null),
    })

  const handleApprove = () =>
    runWithStudyAction({
      action: async (ids) => {
        const idsToApprove = studies
          .filter(
            (s) =>
              ids.includes(s.id) &&
              s.adminApproved === null &&
              isSetupComplete(toSetupStatusStudy(s))
          )
          .map((s) => s.id)
        if (idsToApprove.length === 0) return null
        return approveMutation({ studyIds: idsToApprove })
      },
      successMessage: (count) => `Approved ${count} study/studies`,
      errorMessage: "Failed to approve studies.",
      setLoading: (v) => setActiveAction(v ? "approve" : null),
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
      setLoading: (v) => setActiveAction(v ? "reject" : null),
    })

  const handleDisable = () =>
    runWithStudyAction({
      action: async (ids) => disableMutation({ studyIds: ids }),
      successMessage: (count) => `Disabled data collection for ${count} study/studies`,
      errorMessage: "Failed to disable data collection.",
      setLoading: (v) => setActiveAction(v ? "disable" : null),
    })

  const handleDelete = () =>
    runWithStudyAction({
      action: async (ids) =>
        deleteMutation({ studyIds: ids, reason: "Admin deletion from dashboard" }),
      successMessage: (count) => `Deleted ${count} study/studies`,
      errorMessage: "Failed to delete studies.",
      setLoading: (v) => setActiveAction(v ? "delete" : null),
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
      setLoading: (v) => setActiveAction(v ? "archive" : null),
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
      setLoading: (v) => setActiveAction(v ? "unarchive" : null),
    })

  const isSubmitting = activeAction !== null

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
          aria-busy={activeAction === "approve"}
          onClick={handleApprove}
        >
          {activeAction === "approve" ? "Approving..." : "Approve"}
        </button>
      )}
      {showRejectButton && (
        <button
          type="button"
          className="btn btn-error btn-outline"
          disabled={isSubmitting}
          aria-busy={activeAction === "reject"}
          onClick={handleReject}
        >
          {activeAction === "reject" ? "Rejecting..." : "Reject"}
        </button>
      )}
      {showDisableButton && (
        <button
          type="button"
          className="btn btn-error btn-outline"
          disabled={isSubmitting}
          aria-busy={activeAction === "disable"}
          onClick={handleDisable}
        >
          {activeAction === "disable" ? "Disabling..." : "Disable data collection"}
        </button>
      )}
      {showEnableButton && (
        <button
          type="button"
          className="btn btn-success btn-outline"
          disabled={isSubmitting}
          aria-busy={activeAction === "enable"}
          onClick={handleEnable}
        >
          {activeAction === "enable" ? "Enabling..." : "Enable data collection"}
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
