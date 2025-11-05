"use client"

import type React from "react"
import { AsyncButton } from "./AsyncButton"

/**
 * ConfirmButton Component
 *
 * A button component that shows a confirmation dialog before executing an async action.
 * Wraps AsyncButton with automatic confirmation handling.
 *
 * @example
 * ```tsx
 * <ConfirmButton
 *   onConfirm={async () => await deleteItem()}
 *   confirmMessage="Are you sure you want to delete this item?"
 *   className="btn btn-error"
 * >
 *   Delete
 * </ConfirmButton>
 * ```
 */

interface ConfirmButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /**
   * Async function to execute after user confirms.
   */
  onConfirm: (() => Promise<void>) | (() => void)
  /**
   * Message to show in confirmation dialog.
   */
  confirmMessage: string
  /**
   * Text to show when button is in loading state.
   * If not provided, defaults to "Loading..."
   */
  loadingText?: string
  /**
   * Button content (children) to show when not loading.
   */
  children: React.ReactNode
}

export function ConfirmButton({
  onConfirm,
  confirmMessage,
  loadingText,
  children,
  ...props
}: ConfirmButtonProps) {
  const handleClick = async () => {
    if (window.confirm(confirmMessage)) {
      await onConfirm()
    }
  }

  return (
    <AsyncButton onClick={handleClick} loadingText={loadingText} {...props}>
      {children}
    </AsyncButton>
  )
}
