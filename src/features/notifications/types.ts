import type { z } from "zod"
import type { RouteDataSchema } from "./validations"

export type { NotificationWithRecipient } from "./notificationSelects"

export type RouteData = z.infer<typeof RouteDataSchema>
