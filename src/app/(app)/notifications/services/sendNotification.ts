"use server"

import { revalidateTag } from "next/cache"
import db from "db"

import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { NOTIFICATIONS_MENU_TAG, NOTIFICATIONS_TABLE_TAG } from "../constants"
import { compileTemplate } from "./templates/compileTemplate"
import { stripHtmlTags } from "../utils/stripHtml"
import { validateTemplateData } from "../validations"
import type { RouteData } from "../types"

type SendNotificationInput<TData extends Record<string, any>> = {
  templateId: string
  data: TData
  recipients: number[]
  routeData?: RouteData
  announcement?: boolean
  pinForRecipients?: boolean
}

export const sendNotification = async <TData extends Record<string, any>>({
  templateId,
  data,
  recipients,
  routeData,
  announcement = false,
  pinForRecipients = false,
}: SendNotificationInput<TData>) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("Cannot send notification without recipients")
  }

  const session = await getAuthorizedSession()

  const validationResult = validateTemplateData<TData>(templateId, data)
  if (!validationResult.success) {
    throw new Error(
      `Notification data validation failed for template '${templateId}': ${validationResult.errors}`
    )
  }

  const compiledMessage = await compileTemplate(templateId, validationResult.data)
  const plainMessage = stripHtmlTags(compiledMessage)

  const notification = await db.notification.create({
    data: {
      message: compiledMessage,
      announcement,
      routeData: routeData ?? undefined,
    },
  })

  await db.notificationRecipient.createMany({
    data: recipients.map((userId) => ({
      notificationId: notification.id,
      userId,
      pinned: pinForRecipients,
    })),
    skipDuplicates: true,
  })

  revalidateTag(NOTIFICATIONS_MENU_TAG)
  revalidateTag(NOTIFICATIONS_TABLE_TAG)

  return {
    notificationId: notification.id,
    message: compiledMessage,
    plainMessage,
    recipients,
    createdBy: session.userId,
  }
}
