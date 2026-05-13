import { Suspense } from "react"
import { NotificationContent, getNotificationsRsc } from "@/src/features/notifications"

const AdminNotificationsPage = async () => {
  const notifications = await getNotificationsRsc()

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotificationContent notifications={notifications} />
    </Suspense>
  )
}

export default AdminNotificationsPage
