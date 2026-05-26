import { getCurrentUserRsc } from "@/src/features/auth/server/getCurrentUser"
import { NotificationContent } from "./NotificationContent"
import { getNotificationsRsc } from "../server/getNotifications"

export async function SharedNotificationsPage() {
  const [currentUser, notifications] = await Promise.all([
    getCurrentUserRsc(),
    getNotificationsRsc(),
  ])

  return (
    <NotificationContent notifications={notifications} locale={currentUser?.language ?? "en-US"} />
  )
}
