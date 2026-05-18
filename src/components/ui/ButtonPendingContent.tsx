import type React from "react"

interface ButtonPendingContentProps {
  isPending: boolean
  pendingText?: React.ReactNode
  children: React.ReactNode
}

/**
 * Shared pending-state render helper used by AsyncButton, NavigationButton,
 * and FormSubmitButton. Renders children normally; when pending, shows the
 * pending label next to a DaisyUI loading-dots indicator.
 */
export function ButtonPendingContent({
  isPending,
  pendingText,
  children,
}: ButtonPendingContentProps) {
  if (!isPending) return <>{children}</>
  return (
    <>
      <span>{pendingText}</span>
      <span className="loading loading-dots loading-xs ml-1" aria-hidden />
    </>
  )
}
