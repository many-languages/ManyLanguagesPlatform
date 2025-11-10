import NotificationMessage from "./NotificationMessage"
import { RouteData } from "../../types"

interface Notification {
  id: number
  message: string
  routeData: RouteData | null
}

interface NotificationItemProps {
  key: string | number
  notification: Notification
}

const NotificationItem = ({ notification }: NotificationItemProps) => {
  return (
    <div key={notification.id} className="p-4 rounded-lg shadow-md">
      <NotificationMessage message={notification.message} routeData={notification.routeData} />
    </div>
  )
}

export default NotificationItem
