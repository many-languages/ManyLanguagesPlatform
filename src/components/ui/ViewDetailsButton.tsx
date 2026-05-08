"use client"

import { useState } from "react"

type ViewDetailsButtonProps = {
  hasData: boolean
  buttonLabel: string
  unavailableLabel?: string
  children: (props: { open: boolean; onClose: () => void }) => React.ReactNode
}

export default function ViewDetailsButton({
  hasData,
  buttonLabel,
  unavailableLabel = "Not available",
  children,
}: ViewDetailsButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!hasData) {
    return <span className="text-base-content/50">{unavailableLabel}</span>
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline btn-primary"
        onClick={() => setIsOpen(true)}
      >
        {buttonLabel}
      </button>
      {children({ open: isOpen, onClose: () => setIsOpen(false) })}
    </>
  )
}
