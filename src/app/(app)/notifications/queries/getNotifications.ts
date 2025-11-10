import { Ctx } from "blitz"
import db from "db"
import { cache } from "react"
import { Prisma } from "@prisma/client"
import { getBlitzContext } from "@/src/app/blitz-server"
import { NotificationWithRecipient } from "../types"

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

async function findNotifications(
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

    return findNotifications(session.userId, input)
  }
)

export default async function getNotificationsForUser(
  input: GetNotificationsInput,
  ctx: Ctx
): Promise<NotificationWithRecipient[]> {
  ctx.session.$authorize()

  return findNotifications(ctx.session.userId, input)
}
