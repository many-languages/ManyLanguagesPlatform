// UI compositions
export { default as NotificationMenu } from "./ui/NotificationMenu"
export { default as NotificationItem } from "./ui/NotificationItem"
export { NotificationContent } from "./ui/NotificationContent"

// Context / providers / hooks
export {
  NotificationMenuProvider,
  useNotificationMenuContext,
} from "./context/NotificationMenuContext"
export { NotificationMenuRootProvider } from "./context/NotificationMenuRootProvider"

// Server-side entry points for routes + other features
export { getNotificationsRsc } from "./queries/getNotifications"
export { sendNotification } from "./services/sendNotification"

// Types
export type { NotificationWithRecipient, RouteData } from "./types"
