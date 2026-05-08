import type { NavItem } from "./types"

export const portalNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/studies", label: "My studies" },
  { href: "/explore", label: "Explore" },
]

export const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/invitations", label: "Invites", superAdminOnly: true },
  { href: "/admin/studies", label: "Studies" },
]
