"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import updateStudyStatus from "@/src/app/(app)/studies/mutations/updateStudyStatus"
import { isSetupComplete } from "../../setup/utils/setupStatus"
import type { StudyWithMinimalRelations } from "../../setup/utils/setupStatus"
import { StudyWithRelations } from "../../../queries/getStudy"
import StatusBadge from "@/src/app/components/StatusBadge"
import { getAdminApprovalProps } from "@/src/lib/utils/statusBadgePresets"

interface StudyStatusControlProps {
  study: StudyWithRelations
}

export default function StudyStatusControl({ study }: StudyStatusControlProps) {
  const router = useRouter()
  const [updateStatusMutation] = useMutation(updateStudyStatus)

  const setupComplete = isSetupComplete(study as StudyWithMinimalRelations)
  const isApproved = study.adminApproved === true
  const canActivate = isApproved && setupComplete
  const isArchived = study.archived
  const isOpen = study.status === "OPEN"
  const disabled = !canActivate || isArchived

  const handleToggle = async () => {
    try {
      await updateStatusMutation({
        studyId: study.id,
        status: isOpen ? "CLOSED" : "OPEN",
      })
      toast.success(isOpen ? "Data collection disabled" : "Data collection enabled")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update study status"
      toast.error(message)
    }
  }

  const disabledTip = isArchived
    ? "Archived studies cannot be activated or deactivated. Unarchive the study first — archiving turns data collection off automatically."
    : "Complete setup and get admin approval to activate"
  const enabledTitle = isOpen ? "Stop data collection" : "Start data collection"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-base-content/70">Review status:</span>
      <StatusBadge {...getAdminApprovalProps(study.adminApproved)} />
      <div className="divider divider-horizontal mx-0 my-0 w-2" />
      <span
        className={disabled ? "tooltip tooltip-bottom inline-flex relative z-[60]" : "inline-flex"}
        data-tip={disabled ? disabledTip : undefined}
      >
        <button
          type="button"
          className="btn btn-sm"
          onClick={handleToggle}
          disabled={disabled}
          title={!disabled ? enabledTitle : undefined}
        >
          {isOpen ? "Deactivate" : "Activate"}
        </button>
      </span>
    </div>
  )
}
