"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"
import archiveStudy from "../mutations/archiveStudy"
import unarchiveStudy from "../mutations/unarchiveStudy"
import { useCallback, useState } from "react"

interface ArchiveStudyButtonProps {
  studyId: number
  isArchived: boolean
  redirectTo?: string
}

const ArchiveStudyButton = ({ studyId, isArchived, redirectTo }: ArchiveStudyButtonProps) => {
  const router = useRouter()
  const [archiveStudyMutation] = useMutation(archiveStudy)
  const [unarchiveStudyMutation] = useMutation(unarchiveStudy)
  const [busy, setBusy] = useState(false)

  const onClick = useCallback(async () => {
    if (busy) return

    const action = isArchived ? "unarchive" : "archive"
    const confirmMsg = isArchived
      ? "This study will be restored (made active). Continue?"
      : "This study will be archived (not deleted). Continue?"

    if (!window.confirm(confirmMsg)) return

    setBusy(true)
    try {
      if (isArchived) {
        await unarchiveStudyMutation({ id: studyId })
        toast.success("Study unarchived")
      } else {
        await archiveStudyMutation({ id: studyId })
        toast.success("Study archived")
      }

      // Navigate or refresh to reflect new state
      redirectTo ? router.replace(redirectTo as any) : router.refresh()
    } catch (e: any) {
      toast.error(e?.message || `Failed to ${action} study`)
    } finally {
      setBusy(false)
    }
  }, [busy, isArchived, studyId, redirectTo, archiveStudyMutation, unarchiveStudyMutation, router])

  return (
    <button
      className={`btn ${isArchived ? "btn-success" : "btn-warning"}`}
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
    >
      {busy ? "Please wait..." : isArchived ? "Unarchive" : "Archive"}
    </button>
  )
}

export default ArchiveStudyButton
