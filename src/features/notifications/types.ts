import { Prisma } from "@prisma/client"

export type RouteData = {
  path: string
  params?: Record<string, any>
}

export type NotificationWithRecipient = Prisma.NotificationRecipientGetPayload<{
  include: { notification: true }
}>
