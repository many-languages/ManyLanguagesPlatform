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
  "aria-hidden"?: boolean | "true" | "false"
}

export function LoadingSpinner({ size = "lg", className, ...rest }: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`loading loading-spinner loading-${size} text-secondary ${className || ""}`}
      {...rest}
    />
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

export function LoadingOverlay({ message, minHeight = "200px", className }: LoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center ${className || ""}`}
      style={{ minHeight }}
    >
      <div className="text-center">
        <LoadingSpinner aria-hidden />
        <span className="sr-only">Loading</span>
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

export function LoadingMessage({ message, className }: LoadingMessageProps) {
  return (
    <div role="status" aria-live="polite" className={`text-center text-sm p-3 ${className || ""}`}>
      {message}
    </div>
  )
}
