"use client"

import { useMemo, useTransition } from "react"
import { useFormContext } from "react-hook-form"
import toast from "react-hot-toast"

import { markNotificationsRead, markNotificationsUnread } from "../../actions"
import { NotificationWithRecipient } from "../../types"
import { useNotificationMenuContext } from "../../context/NotificationMenuContext"

type FormValues = {
  selectedIds: number[]
}

type NotificationsBulkActionsProps = {
  notifications: NotificationWithRecipient[]
}

export const NotificationsBulkActions = ({ notifications }: NotificationsBulkActionsProps) => {
  const {
    watch,
    resetField,
    formState: { isSubmitting },
  } = useFormContext<FormValues>()
  const selectedIds = watch("selectedIds")
  const [isPending, startTransition] = useTransition()
  const { refetch } = useNotificationMenuContext()

  const selectedNotifications = useMemo(
    () => notifications.filter((recipient) => selectedIds.includes(recipient.notificationId)),
    [notifications, selectedIds]
  )

  const hasSelection = selectedNotifications.length > 0
  const allRead = hasSelection && selectedNotifications.every((n) => Boolean(n.readAt))
  const allUnread = hasSelection && selectedNotifications.every((n) => !n.readAt)
  const mixedStatus = hasSelection && !allRead && !allUnread
  const busy = isSubmitting || isPending

  const handleAction = (markAsRead: boolean) => {
    if (!hasSelection) return

    const action = markAsRead ? markNotificationsRead : markNotificationsUnread
    const verb = markAsRead ? "read" : "unread"
    const count = selectedNotifications.length

    startTransition(async () => {
      try {
        await action(selectedIds)
        await refetch()
        toast.success(`${count} notification${count === 1 ? "" : "s"} marked as ${verb}.`, {
          id: "notifications-bulk-action",
        })
      } catch (error) {
        console.error("Failed to update notifications:", error)
        toast.error("Failed to update notifications.", { id: "notifications-bulk-action" })
      } finally {
        resetField("selectedIds")
      }
    })
  }

  if (!hasSelection) {
    return (
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary" disabled>
          Mark as read
        </button>
        <button type="button" className="btn btn-secondary" disabled>
          Mark as unread
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {(allUnread || mixedStatus) && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => handleAction(true)}
          disabled={busy}
        >
          {mixedStatus ? "Mark all as read" : "Mark as read"}
        </button>
      )}

      {(allRead || mixedStatus) && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleAction(false)}
          disabled={busy}
        >
          {mixedStatus ? "Mark all as unread" : "Mark as unread"}
        </button>
      )}
    </div>
  )
}
