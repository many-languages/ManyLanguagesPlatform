"use client"

import { useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"

import { markNotificationsRead, markNotificationsUnread } from "../actions"
import { NotificationWithRecipient } from "../types"
import { useNotificationMenuContext } from "../context/NotificationMenuContext"

type ReadToggleProps = {
  recipient: NotificationWithRecipient
}

const ReadToggle = ({ recipient }: ReadToggleProps) => {
  const [isPending, startTransition] = useTransition()
  const { refetch } = useNotificationMenuContext()
  const router = useRouter()
  const [optimisticRead, setOptimisticRead] = useOptimistic(Boolean(recipient.readAt))

  const toggleReadStatus = () => {
    startTransition(async () => {
      setOptimisticRead(!optimisticRead)
      const action = optimisticRead ? markNotificationsUnread : markNotificationsRead
      await action([recipient.notificationId])
      await refetch()
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={toggleReadStatus}
      disabled={isPending}
      className="btn btn-ghost btn-sm"
      aria-pressed={optimisticRead}
      aria-label={optimisticRead ? "Mark as unread" : "Mark as read"}
    >
      {optimisticRead ? (
        <EyeIcon className="h-5 w-5 text-base-content" />
      ) : (
        <EyeSlashIcon className="h-5 w-5 text-primary" />
      )}
    </button>
  )
}

export default ReadToggle
