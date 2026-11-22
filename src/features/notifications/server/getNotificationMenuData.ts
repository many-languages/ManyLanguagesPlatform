import type { NotificationAudience } from "@prisma/client"
import { getUnreadNotificationCountForUser } from "./getUnreadNotificationCount"
import { findLatestUnreadNotificationsForUser } from "./getLatestUnreadNotifications"
import type { NotificationWithRecipient } from "../types"

export interface NotificationMenuData {
  unreadCount: number
  latestUnread: NotificationWithRecipient[]
}

export async function getNotificationMenuDataForUser(
  userId: number,
  audience: NotificationAudience
): Promise<NotificationMenuData> {
  const [unreadCount, latestUnread] = await Promise.all([
    getUnreadNotificationCountForUser(userId, audience),
    findLatestUnreadNotificationsForUser(userId, audience),
  ])
  return { unreadCount, latestUnread }
}
