"use client"

import type React from "react"

/**
 * EmptyState Component
 *
 * A standardized component for displaying empty states (no data, no results, etc.).
 * Provides consistent messaging and styling across the application.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   message="No results found"
 *   title="No Data"
 *   action={<button>Refresh</button>}
 * />
 * ```
 */

interface EmptyStateProps {
  /**
   * Main message to display
   */
  message: string
  /**
   * Optional title above the message
   */
  title?: string
  /**
   * Optional icon or visual element
   */
  icon?: React.ReactNode
  /**
   * Optional action button or element
   */
  action?: React.ReactNode
  /**
   * Additional CSS classes
   */
  className?: string
}

export function EmptyState({ message, title, icon, action, className }: EmptyStateProps) {
  return (
    <div className={`text-center p-8 ${className || ""}`}>
      {icon && <div className="mb-4">{icon}</div>}
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      <p className="text-sm text-base-content/70 mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
