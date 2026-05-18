import { getUnreadNotificationCountForUser } from "./getUnreadNotificationCount"
import { findLatestUnreadNotificationsForUser } from "./getLatestUnreadNotifications"
import type { NotificationWithRecipient } from "../types"

export interface NotificationMenuData {
  unreadCount: number
  latestUnread: NotificationWithRecipient[]
}

export async function getNotificationMenuDataForUser(
  userId: number
): Promise<NotificationMenuData> {
  const [unreadCount, latestUnread] = await Promise.all([
    getUnreadNotificationCountForUser(userId),
    findLatestUnreadNotificationsForUser(userId),
  ])
  return { unreadCount, latestUnread }
}
