"use client"

import type React from "react"
import clsx from "clsx"

/**
 * Alert Component
 *
 * Card-like panels aligned with study page callouts (e.g. bg-{semantic}/10 + border-{semantic}/20),
 * not DaisyUI `alert-*` solids (which read as mismatched fill vs border).
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

const variantSurface: Record<AlertVariant, string> = {
  error: "rounded-lg border border-error/20 bg-error/10 text-base-content shadow-sm",
  warning: "rounded-lg border border-warning/20 bg-warning/10 text-base-content shadow-sm",
  info: "rounded-lg border border-info/20 bg-info/10 text-base-content shadow-sm",
  success: "rounded-lg border border-success/20 bg-success/10 text-base-content shadow-sm",
}

const variantTitle: Record<AlertVariant, string> = {
  error: "text-error",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
}

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
    <div
      className={clsx(
        "select-text p-4 sm:p-6",
        variantSurface[variant],
        onClose && "flex flex-row items-start gap-3",
        className
      )}
      role={alertRole}
    >
      <div className={clsx("min-w-0 flex-1 flex flex-col", title && "gap-2")}>
        {title && (
          <span className={clsx("font-semibold text-base", variantTitle[variant])}>{title}</span>
        )}
        <div className="text-sm text-base-content/80 [&_p]:leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          className="btn btn-sm btn-ghost shrink-0"
          onClick={onClose}
          aria-label="Close alert"
        >
          ×
        </button>
      )}
    </div>
  )
}
