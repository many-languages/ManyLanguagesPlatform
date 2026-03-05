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
  const isOpen = study.status === "OPEN"

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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-base-content/70">Review status:</span>
      <StatusBadge {...getAdminApprovalProps(study.adminApproved)} />
      <div className="divider divider-horizontal mx-0 my-0 w-2" />
      <button
        type="button"
        className="btn btn-sm"
        onClick={handleToggle}
        disabled={!canActivate}
        title={
          !canActivate
            ? "Complete setup and get admin approval to activate"
            : isOpen
            ? "Stop data collection"
            : "Start data collection"
        }
      >
        {isOpen ? "Deactivate" : "Activate"}
      </button>
      {!canActivate && (
        <span className="text-xs text-base-content/60">
          Complete setup and get admin approval to activate
        </span>
      )}
    </div>
  )
}
