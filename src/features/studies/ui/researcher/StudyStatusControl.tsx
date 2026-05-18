"use client"

import { useState, useTransition } from "react"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import updateStudyStatus from "@/src/features/studies/mutations/updateStudyStatus"
import { isSetupComplete, type StudyWithMinimalRelations } from "../../domain/setup/setupStatus"
import type { StudyWithRelations } from "../../types"
import StatusBadge from "@/src/components/ui/StatusBadge"
import { getAdminApprovalProps } from "@/src/lib/utils/statusBadgePresets"

interface StudyStatusControlProps {
  study: StudyWithRelations
}

export default function StudyStatusControl({ study }: StudyStatusControlProps) {
  const router = useRouter()
  const [updateStatusMutation] = useMutation(updateStudyStatus)
  const [, startTransition] = useTransition()

  const setupComplete = isSetupComplete(study as StudyWithMinimalRelations)
  const isApproved = study.adminApproved === true
  const canLaunch = isApproved && setupComplete
  const isArchived = study.archived
  const [isOpen, setIsOpen] = useState(study.status === "OPEN")
  const disabled = !canLaunch || isArchived

  const handleToggle = async () => {
    const nextIsOpen = !isOpen
    setIsOpen(nextIsOpen)
    try {
      await updateStatusMutation({
        studyId: study.id,
        status: nextIsOpen ? "OPEN" : "CLOSED",
      })
      toast.success(nextIsOpen ? "Study launched" : "Data collection paused")
      startTransition(() => router.refresh())
    } catch (error) {
      setIsOpen(!nextIsOpen)
      const message = error instanceof Error ? error.message : "Failed to update study status"
      toast.error(message)
    }
  }

  const disabledTip = isArchived
    ? "Archived studies cannot be launched or paused. Unarchive the study first — archiving turns data collection off automatically."
    : "Complete setup and get admin approval to launch"
  const enabledTitle = isOpen ? "Pause data collection" : "Launch data collection"

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
          {isOpen ? "Pause" : "Launch"}
        </button>
      </span>
    </div>
  )
}
