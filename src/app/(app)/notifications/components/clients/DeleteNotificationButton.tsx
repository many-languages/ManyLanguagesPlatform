"use client"

import { useTransition } from "react"
import toast from "react-hot-toast"

import { deleteNotifications } from "../../actions"
import { useNotificationMenuContext } from "../../context/NotificationMenuContext"

interface DeleteNotificationButtonProps {
  ids: number[]
}

export const DeleteNotificationButton = ({ ids }: DeleteNotificationButtonProps) => {
  const [isPending, startTransition] = useTransition()
  const { refetch } = useNotificationMenuContext()

  const handleDelete = () => {
    if (ids.length === 0) return

    const confirmed =
      typeof window === "undefined"
        ? false
        : window.confirm(
            `Delete ${ids.length} notification${ids.length > 1 ? "s" : ""}? This cannot be undone.`
          )

    if (!confirmed) return

    startTransition(async () => {
      try {
        const { deleted } = await deleteNotifications(ids)
        await refetch()
        toast.success(`Deleted ${deleted} notification${deleted === 1 ? "" : "s"}.`)
      } catch (error) {
        console.error("Error deleting notifications:", error)
        toast.error("Failed to delete notifications.")
      }
    })
  }

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={handleDelete}
      disabled={ids.length === 0 || isPending}
    >
      Delete{ids.length > 1 ? " Notifications" : " Notification"}
    </button>
  )
}
