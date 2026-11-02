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

// Server services, loaders and server components live in `./index.server.ts`
// (avoid re-exporting ./queries/* — Blitz RPC client loader strips named exports);
// only erased types are re-exported here.
export type { NotificationMenuData } from "./server/getNotificationMenuData"

// Types
export type { NotificationWithRecipient, RouteData } from "./types"
