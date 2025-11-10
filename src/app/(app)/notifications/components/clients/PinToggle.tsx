"use client"

import { useTransition } from "react"
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid"
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline"

import { toggleNotificationPinned } from "../../actions/toggleNotificationPinned"
import { useNotificationMenuContext } from "../../context/NotificationMenuContext"
import type { NotificationWithRecipient } from "../../types"

type PinToggleProps = {
  recipient: NotificationWithRecipient
}

export const PinToggle = ({ recipient }: PinToggleProps) => {
  const [isPending, startTransition] = useTransition()
  const { refetch } = useNotificationMenuContext()
  const isPinned = recipient.pinned

  const handleToggle = () => {
    startTransition(async () => {
      await toggleNotificationPinned({
        notificationId: recipient.notificationId,
        pinned: !isPinned,
      })
      await refetch()
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className="btn btn-ghost btn-sm"
      aria-pressed={isPinned}
      aria-label={isPinned ? "Unpin notification" : "Pin notification"}
    >
      {isPinned ? (
        <StarIconSolid className="h-5 w-5 text-warning" />
      ) : (
        <StarIconOutline className="h-5 w-5 text-base-content/40" />
      )}
    </button>
  )
}
