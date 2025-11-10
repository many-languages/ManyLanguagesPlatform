import { Suspense } from "react"
import { NotificationContent } from "./components/clients/NotificationContent"
import { getNotificationsRsc } from "./queries/getNotifications"

const NotificationsPage = async () => {
  const notifications = await getNotificationsRsc()

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotificationContent notifications={notifications} />
    </Suspense>
  )
}

export default NotificationsPage
