"use client"

import type React from "react"

/**
 * Alert Component
 *
 * A standardized alert component wrapper for DaisyUI alerts.
 * Provides type-safe variants and consistent styling.
 *
 * @example
 * ```tsx
 * <Alert variant="error" title="Error">
 *   Something went wrong
 * </Alert>
 *
 * <Alert variant="warning">
 *   Please complete all fields
 * </Alert>
 * ```
 */

export type AlertVariant = "error" | "warning" | "info" | "success"

interface AlertProps {
  /**
   * Alert variant (determines color and icon)
   */
  variant: AlertVariant
  /**
   * Optional title for the alert
   */
  title?: string
  /**
   * Alert content
   */
  children: React.ReactNode
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Optional close button handler
   */
  onClose?: () => void
  /**
   * ARIA role (defaults to "alert" for error/warning, "status" for info/success)
   */
  role?: string
}

export function Alert({ variant, title, children, className, onClose, role }: AlertProps) {
  const defaultRole = variant === "error" || variant === "warning" ? "alert" : "status"
  const alertRole = role || defaultRole

  return (
    <div className={`alert alert-${variant} select-text ${className || ""}`} role={alertRole}>
      {title && <span className="font-semibold">{title}</span>}
      <div>{children}</div>
      {onClose && (
        <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close alert">
          ×
        </button>
      )}
    </div>
  )
}
