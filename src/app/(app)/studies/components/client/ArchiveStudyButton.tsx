"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"
import archiveStudy from "../../mutations/archiveStudy"
import unarchiveStudy from "../../mutations/unarchiveStudy"
import { ConfirmButton } from "@/src/app/components/ConfirmButton"

interface ArchiveStudyButtonProps {
  studyId: number
  isArchived: boolean
  redirectTo?: string
}

const ArchiveStudyButton = ({ studyId, isArchived, redirectTo }: ArchiveStudyButtonProps) => {
  const router = useRouter()
  const [archiveStudyMutation] = useMutation(archiveStudy)
  const [unarchiveStudyMutation] = useMutation(unarchiveStudy)

  const handleConfirm = async () => {
    const action = isArchived ? "unarchive" : "archive"

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
    }
  }

  const confirmMessage = isArchived
    ? "This study will be restored (made active). Continue?"
    : "This study will be archived (not deleted). Continue?"

  return (
    <ConfirmButton
      onConfirm={handleConfirm}
      confirmMessage={confirmMessage}
      loadingText="Please wait..."
      className={`btn ${isArchived ? "btn-success" : "btn-warning"}`}
    >
      {isArchived ? "Unarchive" : "Archive"}
    </ConfirmButton>
  )
}

export default ArchiveStudyButton
