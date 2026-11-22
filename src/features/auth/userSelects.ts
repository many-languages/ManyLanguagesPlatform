import type { Prisma } from "db"

/** Login / password verification — loads hash only when needed. */
export const authUserWithPasswordSelect = {
  id: true,
  email: true,
  roles: true,
  hashedPassword: true,
} satisfies Prisma.UserSelect

export type AuthUserWithPassword = Prisma.UserGetPayload<{
  select: typeof authUserWithPasswordSelect
}>

export const userIdEmailSelect = {
  id: true,
  email: true,
} satisfies Prisma.UserSelect

export const resetPasswordUserSelect = {
  id: true,
  roles: true,
} satisfies Prisma.UserSelect
