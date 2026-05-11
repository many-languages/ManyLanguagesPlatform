import { Prisma } from "@prisma/client"
import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"
import db from "db"
import type { NotificationWithRecipient } from "../types"

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
  input: GetNotificationsInput = {}
): Promise<NotificationWithRecipient[]> {
  const { includeDismissed = false, orderBy, skip, take } = input

  return db.notificationRecipient.findMany({
    where: {
      userId,
      ...(includeDismissed ? {} : { dismissedAt: null }),
    },
    include: {
      notification: true,
    },
    orderBy: orderBy ?? DEFAULT_ORDER_BY,
    skip,
    take,
  })
}

export const getNotificationsRsc = cache(
  async (input: GetNotificationsInput = {}): Promise<NotificationWithRecipient[]> => {
    const { session } = await getBlitzContext()
    if (!session.userId) return []

    return findNotificationsForUser(session.userId, input)
  }
)
