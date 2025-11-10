"use client"

import { useTransition } from "react"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"

import { markNotificationsRead, markNotificationsUnread } from "../../actions"
import { NotificationWithRecipient } from "../../types"
import { useNotificationMenuContext } from "../../context/NotificationMenuContext"

type ReadToggleProps = {
  recipient: NotificationWithRecipient
}

const ReadToggle = ({ recipient }: ReadToggleProps) => {
  const [isPending, startTransition] = useTransition()
  const { refetch } = useNotificationMenuContext()
  const isRead = Boolean(recipient.readAt)

  const toggleReadStatus = () => {
    startTransition(async () => {
      const action = isRead ? markNotificationsUnread : markNotificationsRead
      await action([recipient.notificationId])
      await refetch()
    })
  }

  return (
    <button
      type="button"
      onClick={toggleReadStatus}
      disabled={isPending}
      className="btn btn-ghost btn-sm"
      aria-pressed={isRead}
      aria-label={isRead ? "Mark as unread" : "Mark as read"}
    >
      {isRead ? (
        <EyeIcon className="h-5 w-5 text-base-content" />
      ) : (
        <EyeSlashIcon className="h-5 w-5 text-primary" />
      )}
    </button>
  )
}

export default ReadToggle
