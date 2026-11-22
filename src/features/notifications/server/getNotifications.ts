import { Prisma, type NotificationAudience } from "@prisma/client"
import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"
import db from "db"
import { notificationRecipientWithNotificationSelect } from "../notificationSelects"
import type { NotificationWithRecipient } from "../types"
import { notificationAudienceForRole } from "../utils/audience"

type OrderBy =
  | Prisma.NotificationRecipientOrderByWithRelationInput
  | Prisma.NotificationRecipientOrderByWithRelationInput[]

export type GetNotificationsInput = {
  skip?: number
  take?: number
  orderBy?: OrderBy
  includeDismissed?: boolean
}

const DEFAULT_ORDER_BY: Prisma.NotificationRecipientOrderByWithRelationInput[] = [
  { pinned: "desc" },
  { readAt: "asc" },
  { createdAt: "desc" },
]

export async function findNotificationsForUser(
  userId: number,
  audience: NotificationAudience,
  input: GetNotificationsInput = {}
): Promise<NotificationWithRecipient[]> {
  const { includeDismissed = false, orderBy, skip, take } = input

  return db.notificationRecipient.findMany({
    where: {
      userId,
      notification: { audience },
      ...(includeDismissed ? {} : { dismissedAt: null }),
    },
    select: notificationRecipientWithNotificationSelect,
    orderBy: orderBy ?? DEFAULT_ORDER_BY,
    skip,
    take,
  })
}

export const getNotificationsRsc = cache(
  async (input: GetNotificationsInput = {}): Promise<NotificationWithRecipient[]> => {
    const { session } = await getBlitzContext()
    if (!session.userId) return []

    return findNotificationsForUser(
      session.userId,
      notificationAudienceForRole(session.role),
      input
    )
  }
)
