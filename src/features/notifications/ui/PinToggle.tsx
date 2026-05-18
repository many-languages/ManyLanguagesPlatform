"use client"

import { useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid"
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline"

import { toggleNotificationPinned } from "../actions/toggleNotificationPinned"
import { useNotificationMenuContext } from "../context/NotificationMenuContext"
import type { NotificationWithRecipient } from "../types"

type PinToggleProps = {
  recipient: NotificationWithRecipient
}

export const PinToggle = ({ recipient }: PinToggleProps) => {
  const [isPending, startTransition] = useTransition()
  const { refetch } = useNotificationMenuContext()
  const router = useRouter()
  const [optimisticPinned, setOptimisticPinned] = useOptimistic(recipient.pinned)

  const handleToggle = () => {
    startTransition(async () => {
      setOptimisticPinned(!optimisticPinned)
      await toggleNotificationPinned({
        notificationId: recipient.notificationId,
        pinned: !optimisticPinned,
      })
      await refetch()
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className="btn btn-ghost btn-sm"
      aria-pressed={optimisticPinned}
      aria-label={optimisticPinned ? "Unpin notification" : "Pin notification"}
    >
      {optimisticPinned ? (
        <StarIconSolid className="h-5 w-5 text-warning" />
      ) : (
        <StarIconOutline className="h-5 w-5 text-base-content/40" />
      )}
    </button>
  )
}
