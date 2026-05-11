import type { Prisma } from "@prisma/client"

export const currentUserSelect = {
  id: true,
  firstname: true,
  lastname: true,
  username: true,
  email: true,
  role: true,
  gravatar: true,
  createdAt: true,
  language: true,
} satisfies Prisma.UserSelect

export type CurrentUserFromSession = Prisma.UserGetPayload<{ select: typeof currentUserSelect }>
