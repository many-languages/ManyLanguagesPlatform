"use client"

/**
 * LoadingStates Components
 *
 * Reusable loading components for consistent loading displays throughout the application.
 * Includes spinner, overlay, and inline message variants.
 *
 * @example
 * ```tsx
 * // Simple spinner
 * <LoadingSpinner />
 *
 * // Overlay with message
 * <LoadingOverlay message="Loading data..." />
 *
 * // Inline loading message
 * <LoadingMessage message="Processing..." />
 * ```
 */

interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   * @default "lg"
   */
  size?: "sm" | "md" | "lg"
  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * Loading spinner component
 */
export function LoadingSpinner({ size = "lg", className }: LoadingSpinnerProps) {
  return (
    <span className={`loading loading-spinner loading-${size} text-secondary ${className || ""}`} />
  )
}

interface LoadingOverlayProps {
  /**
   * Optional message to display below spinner
   */
  message?: string
  /**
   * Minimum height for the overlay
   * @default "200px"
   */
  minHeight?: string
  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * Loading overlay component - centers spinner and optional message
 */
export function LoadingOverlay({ message, minHeight = "200px", className }: LoadingOverlayProps) {
  return (
    <div className={`flex items-center justify-center ${className || ""}`} style={{ minHeight }}>
      <div className="text-center">
        <LoadingSpinner />
        {message && <p className="mt-4 text-sm">{message}</p>}
      </div>
    </div>
  )
}

interface LoadingMessageProps {
  /**
   * Message to display
   */
  message: string
  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * Inline loading message component
 */
export function LoadingMessage({ message, className }: LoadingMessageProps) {
  return <div className={`text-center text-sm p-3 ${className || ""}`}>{message}</div>
}
