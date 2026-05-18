import { Suspense } from "react"
import { NotificationContent } from "./NotificationContent"
import { getNotificationsRsc } from "../server/getNotifications"

export async function SharedNotificationsPage() {
  const notifications = await getNotificationsRsc()

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotificationContent notifications={notifications} />
    </Suspense>
  )
}
