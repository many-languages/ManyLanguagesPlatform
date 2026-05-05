import cn from "classnames"

export type StatusBadgeVariant = "success" | "error" | "warning" | "info" | "ghost" | "primary"

type StatusBadgeProps = {
  label: string
  variant: StatusBadgeVariant
  size?: "xs" | "sm" | "lg"
  className?: string
}

const variantClasses: Record<StatusBadgeVariant, string> = {
  success: "badge-success",
  error: "badge-error",
  warning: "badge-warning",
  info: "badge-info",
  ghost: "badge-ghost",
  primary: "badge-primary",
}

const sizeClasses: Record<NonNullable<StatusBadgeProps["size"]>, string> = {
  xs: "badge-xs",
  sm: "badge-sm",
  lg: "badge-lg",
}

export default function StatusBadge({ label, variant, size, className }: StatusBadgeProps) {
  return (
    <span className={cn("badge", variantClasses[variant], size && sizeClasses[size], className)}>
      {label}
    </span>
  )
}
