import { Suspense } from "react"
import { NotificationContent } from "@/src/features/notifications"
import { getNotificationsRsc } from "@/src/features/notifications/queries/getNotifications"

const NotificationsPage = async () => {
  const notifications = await getNotificationsRsc()

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotificationContent notifications={notifications} />
    </Suspense>
  )
}

export default NotificationsPage
