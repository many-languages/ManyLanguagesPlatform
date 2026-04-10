"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"
import { ConfirmButton } from "@/src/app/components/ConfirmButton"
import archiveStudy from "@/src/app/(app)/studies/mutations/archiveStudy"
import deleteResearcherStudy from "@/src/app/(app)/studies/mutations/deleteResearcherStudy"
import unarchiveStudy from "@/src/app/(app)/studies/mutations/unarchiveStudy"

export type StudyLifecycleActionsProps = {
  studyId: number
  isArchived: boolean
  /** From JATOS metadata; null if metadata could not be loaded */
  hasParticipantResponses: boolean | null
  /** PI-only: hide all archive/delete/unarchive controls for collaborators/viewers */
  showLifecycleActions: boolean
}

/**
 * Delete vs archive per product rules; unarchive when archived.
 * Server mutations enforce the same rules (fail closed on metadata errors).
 */
export default function StudyLifecycleActions({
  studyId,
  isArchived,
  hasParticipantResponses,
  showLifecycleActions,
}: StudyLifecycleActionsProps) {
  const router = useRouter()
  const [archiveMutation] = useMutation(archiveStudy)
  const [deleteMutation] = useMutation(deleteResearcherStudy)
  const [unarchiveMutation] = useMutation(unarchiveStudy)

  if (!showLifecycleActions) {
    return null
  }

  if (hasParticipantResponses === null) {
    return (
      <p className="text-sm text-base-content/70 max-w-md text-right">
        Could not load study results metadata. Archive and delete are unavailable until JATOS is
        reachable.
      </p>
    )
  }

  const refresh = () => router.refresh()

  if (isArchived) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <ConfirmButton
          onConfirm={async () => {
            await unarchiveMutation({ id: studyId })
            toast.success("Study unarchived")
            refresh()
          }}
          confirmMessage="This study will be restored (made active). Continue?"
          loadingText="Please wait"
          className="btn btn-success"
        >
          Unarchive
        </ConfirmButton>
        {!hasParticipantResponses && (
          <ConfirmButton
            onConfirm={async () => {
              await deleteMutation({ id: studyId })
              toast.success("Study deleted")
              router.replace("/studies")
            }}
            confirmMessage="This will permanently delete this study from the database and JATOS. This cannot be undone. Continue?"
            loadingText="Deleting"
            className="btn btn-error"
          >
            Delete study
          </ConfirmButton>
        )}
      </div>
    )
  }

  if (hasParticipantResponses) {
    return (
      <ConfirmButton
        onConfirm={async () => {
          await archiveMutation({ id: studyId })
          toast.success("Study archived")
          refresh()
        }}
        confirmMessage="This study will be archived (hidden from active lists, not permanently deleted). Continue?"
        loadingText="Please wait"
        className="btn btn-warning"
      >
        Archive
      </ConfirmButton>
    )
  }

  return (
    <ConfirmButton
      onConfirm={async () => {
        await deleteMutation({ id: studyId })
        toast.success("Study deleted")
        router.replace("/studies")
      }}
      confirmMessage="This will permanently delete this study from the database and JATOS. This cannot be undone. Continue?"
      loadingText="Deleting"
      className="btn btn-error"
    >
      Delete study
    </ConfirmButton>
  )
}
