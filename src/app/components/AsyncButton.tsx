"use client"

import { useState } from "react"
import type React from "react"

/**
 * AsyncButton Component
 *
 * A button component that handles async onClick handlers with automatic loading state management.
 * Eliminates boilerplate loading state code across the codebase.
 *
 * @example
 * ```tsx
 * <AsyncButton
 *   onClick={async () => await someAction()}
 *   loadingText="Processing..."
 *   className="btn btn-primary"
 * >
 *   Submit
 * </AsyncButton>
 * ```
 */

interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Async onClick handler. Loading state is automatically managed.
   */
  onClick: (() => Promise<void>) | (() => void)
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

export function AsyncButton({
  onClick,
  loadingText,
  children,
  className,
  disabled,
  ...props
}: AsyncButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading || disabled) return

    setLoading(true)
    try {
      await onClick()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`btn ${className || ""}`}
      onClick={handleClick}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <>
          <span>{loadingText || "Loading..."}</span>
          <span className="loading loading-dots loading-xs ml-1"></span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
