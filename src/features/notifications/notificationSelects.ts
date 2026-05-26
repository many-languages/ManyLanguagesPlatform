import type { Prisma } from "@prisma/client"

export const notificationForRecipientSelect = {
  id: true,
  createdAt: true,
  message: true,
  routeData: true,
} satisfies Prisma.NotificationSelect

export const notificationRecipientWithNotificationSelect = {
  notificationId: true,
  userId: true,
  readAt: true,
  dismissedAt: true,
  pinned: true,
  createdAt: true,
  notification: { select: notificationForRecipientSelect },
} satisfies Prisma.NotificationRecipientSelect

export type NotificationWithRecipient = Prisma.NotificationRecipientGetPayload<{
  select: typeof notificationRecipientWithNotificationSelect
}>
