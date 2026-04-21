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

// Server-side entry points for routes + other features (avoid re-exporting ./queries/* — Blitz RPC client loader strips named exports)
export { sendNotification } from "./services/sendNotification"
export { notifyAdminsOfPendingStudyReview } from "./services/notifyAdminsOfPendingStudyReview"

// Types
export type { NotificationWithRecipient, RouteData } from "./types"
