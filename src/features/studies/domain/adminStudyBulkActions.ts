import { isSuperAdmin } from "@/src/lib/auth/roles"
import { isSetupComplete, toSetupStatusStudy } from "./setup/setupStatus"
import type { AdminStudyListItemDto } from "../types"
import type { UserRole } from "@/db"

export interface AdminStudyBulkActionsResult {
  showApproveButton: boolean
  showRejectButton: boolean
  showEnableButton: boolean
  showDisableButton: boolean
  showArchiveButton: boolean
  showUnarchiveButton: boolean
  hideDeleteForStaffAdmin: boolean
  deleteEnabled: boolean
  deleteDisabledReason: string | null
  deleteConfirmMessage: string
  enableTargetIds: number[]
  enableBlockedMessage: string | null
  disableTargetIds: number[]
  approveTargetIds: number[]
  rejectTargetIds: number[]
  deleteTargetIds: number[]
  archiveTargetIds: number[]
  unarchiveTargetIds: number[]
}

export function getAdminStudyBulkActions(
  selectedStudies: AdminStudyListItemDto[],
  viewerRole: UserRole
): AdminStudyBulkActionsResult {
  if (selectedStudies.length === 0) {
    return {
      showApproveButton: false,
      showRejectButton: false,
      showEnableButton: false,
      showDisableButton: false,
      showArchiveButton: false,
      showUnarchiveButton: false,
      hideDeleteForStaffAdmin: false,
      deleteEnabled: false,
      deleteDisabledReason: null,
      deleteConfirmMessage: "",
      enableTargetIds: [],
      enableBlockedMessage: null,
      disableTargetIds: [],
      approveTargetIds: [],
      rejectTargetIds: [],
      deleteTargetIds: [],
      archiveTargetIds: [],
      unarchiveTargetIds: [],
    }
  }

  const hasPending = selectedStudies.some((s) => s.adminApproved === null)
  const pendingWithSetupComplete = selectedStudies.filter(
    (s) => s.adminApproved === null && isSetupComplete(toSetupStatusStudy(s))
  )
  const hasPendingWithSetupComplete = pendingWithSetupComplete.length > 0
  const allApproved = selectedStudies.every((s) => s.adminApproved === true)
  const allEnabled = selectedStudies.every((s) => s.status === "OPEN")
  const allDisabled = selectedStudies.every((s) => s.status === "CLOSED")
  const mixed = !allEnabled && !allDisabled

  /** Archive only when every selected study has real participant responses and is not already archived. */
  const showArchiveButton = selectedStudies.every(
    (s) => !s.archived && s.hasParticipantResponses === true
  )

  /** Unarchive when every selected study is archived. */
  const allArchived = selectedStudies.every((s) => s.archived)
  const showUnarchiveButton = allArchived

  const superadmin = isSuperAdmin(viewerRole)

  /** Non-super-admins cannot delete archived studies that have responses. */
  const hideDeleteForStaffAdmin =
    !superadmin && selectedStudies.some((s) => s.hasParticipantResponses === true && s.archived)

  const deleteDisabledReason = selectedStudies.some((s) => s.hasParticipantResponses === null)
    ? "Could not verify participant response data. Try again later."
    : selectedStudies.some((s) => s.hasParticipantResponses === true && !s.archived)
    ? "Studies with participant responses must be archived before they can be deleted. Adjust your selection."
    : null

  const deleteEnabled = !hideDeleteForStaffAdmin && deleteDisabledReason === null

  const deleteConfirmMessage =
    superadmin && selectedStudies.some((s) => s.archived)
      ? "This will permanently remove the selected archived study/studies from the platform and JATOS. All related data will be lost. Before continuing, confirm that study materials and results are copied to a long-term archive (for example Zenodo). This cannot be undone. Continue?"
      : "This will permanently delete the selected study/studies from the database and JATOS. This cannot be undone. Continue?"

  const showApproveButton = hasPendingWithSetupComplete
  const showRejectButton = hasPending
  const showDisableButton = allApproved && (allEnabled || mixed) && !allArchived
  const showEnableButton = allApproved && (allDisabled || mixed) && !allArchived
  const selectedStudyIds = selectedStudies.map((s) => s.id)
  const enableBlockedStudies = selectedStudies.filter(
    (s) => s.adminApproved !== true || !isSetupComplete(toSetupStatusStudy(s))
  )
  const enableBlockedMessage =
    enableBlockedStudies.length > 0
      ? `Cannot enable data collection. The following studies need admin approval and completed setup: ${enableBlockedStudies
          .map((s) => s.title?.trim() || `Study #${s.id}`)
          .join(", ")}`
      : null
  const enableTargetIds = enableBlockedMessage ? [] : selectedStudyIds
  const approveTargetIds = pendingWithSetupComplete.map((s) => s.id)
  const rejectTargetIds = selectedStudies.filter((s) => s.adminApproved === null).map((s) => s.id)
  const disableTargetIds = showDisableButton ? selectedStudyIds : []
  const deleteTargetIds = deleteEnabled ? selectedStudyIds : []
  const archiveTargetIds = showArchiveButton ? selectedStudyIds : []
  const unarchiveTargetIds = showUnarchiveButton ? selectedStudyIds : []

  return {
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
    enableTargetIds,
    enableBlockedMessage,
    disableTargetIds,
    approveTargetIds,
    rejectTargetIds,
    deleteTargetIds,
    archiveTargetIds,
    unarchiveTargetIds,
  }
}
