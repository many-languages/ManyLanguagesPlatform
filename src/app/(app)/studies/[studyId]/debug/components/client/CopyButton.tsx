"use client"

import { useCopyToClipboard } from "../../hooks/useCopyToClipboard"
import { useCallback } from "react"

interface CopyButtonProps {
  /** Function that returns the text to copy. Called when button is clicked. */
  getTextToCopy: () => string
  /** Optional custom className for the button */
  className?: string
  /** Button label when not copied */
  label?: string
  /** Button label when copy is successful */
  successLabel?: string
  /** Optional disabled state */
  disabled?: boolean
}

export default function CopyButton({
  getTextToCopy,
  className = "btn btn-sm btn-outline",
  label = "Copy JSON",
  successLabel = "Copied!",
  disabled = false,
}: CopyButtonProps) {
  const { copySuccess, copyToClipboard } = useCopyToClipboard()

  const handleClick = useCallback(async () => {
    const text = getTextToCopy()
    if (text) {
      await copyToClipboard(text)
    }
  }, [getTextToCopy, copyToClipboard])

  return (
    <button className={className} onClick={handleClick} disabled={disabled}>
      {copySuccess ? successLabel : label}
    </button>
  )
}
