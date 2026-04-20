import type { NavItem } from "./types"

/** Portal shell: researcher & participant (notifications live in the navbar, not in this list). */
export const portalNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/studies", label: "My studies" },
  { href: "/explore", label: "Explore" },
]

/** Admin shell: staff admin navigation. */
export const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/invitations", label: "Invites", superAdminOnly: true },
  { href: "/admin/studies", label: "Studies" },
]
