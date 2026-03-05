import type { StatusBadgeVariant } from "@/src/app/components/StatusBadge"

export type StatusBadgeProps = { label: string; variant: StatusBadgeVariant }

export function getAdminApprovalProps(adminApproved: boolean | null): StatusBadgeProps {
  if (adminApproved === true) return { label: "Approved", variant: "success" }
  if (adminApproved === false) return { label: "Rejected", variant: "error" }
  return { label: "Pending", variant: "warning" }
}

export function getAdminApprovalVariant(label: string): StatusBadgeVariant {
  const map: Record<string, StatusBadgeVariant> = {
    Approved: "success",
    Rejected: "error",
    Pending: "warning",
  }
  return map[label] ?? "warning"
}

export function getSetupStatusProps(status: string): StatusBadgeProps {
  if (status === "finished") return { label: status, variant: "success" }
  if (status === "Not started") return { label: status, variant: "ghost" }
  return { label: status, variant: "info" }
}

export function getDataCollectionProps(status: string): StatusBadgeProps {
  const isEnabled = status === "OPEN"
  return {
    label: isEnabled ? "Enabled" : "Disabled",
    variant: isEnabled ? "success" : "error",
  }
}

export function getInviteStatusProps(
  status: "pending" | "redeemed" | "revoked" | "expired"
): StatusBadgeProps {
  const variantMap: Record<string, StatusBadgeVariant> = {
    pending: "info",
    redeemed: "success",
    revoked: "error",
    expired: "warning",
  }
  return {
    label: status,
    variant: variantMap[status] ?? "warning",
  }
}
