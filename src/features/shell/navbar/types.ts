export type NavbarVariant = "portal" | "admin"

export type CurrentUser = {
  id: number
  firstname: string | null
  lastname: string | null
  username: string | null
  email: string
  role: string
  gravatar: string | null
  createdAt: Date
} | null

export type NavItem = {
  href: string
  label: string
  superAdminOnly?: boolean
}
