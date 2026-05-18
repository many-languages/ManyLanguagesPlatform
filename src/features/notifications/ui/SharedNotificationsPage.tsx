import { NotificationContent } from "./NotificationContent"
import { getNotificationsRsc } from "../server/getNotifications"

export async function SharedNotificationsPage() {
  const notifications = await getNotificationsRsc()

  return <NotificationContent notifications={notifications} />
}
