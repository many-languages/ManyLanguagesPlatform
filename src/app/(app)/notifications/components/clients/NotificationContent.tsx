"use client"

import { InformationCircleIcon } from "@heroicons/react/24/outline"
import { FormProvider, useForm } from "react-hook-form"

import Card from "../../../../components/Card"
import { NotificationTable } from "./NotificationTable"
import { NotificationsBulkActions } from "./NotificationsBulkActions"
import { DeleteNotificationButton } from "./DeleteNotificationButton"
import { NotificationWithRecipient } from "../../types"

type FormValues = {
  selectedIds: number[]
}

type NotificationContentProps = {
  notifications: NotificationWithRecipient[]
}

export const NotificationContent = ({ notifications }: NotificationContentProps) => {
  const formMethods = useForm<FormValues>({
    defaultValues: { selectedIds: [] },
    mode: "onChange",
  })

  const selectedIds = formMethods.watch("selectedIds")

  return (
    <main className="flex flex-col mx-auto w-full gap-6">
      <header className="flex flex-col items-center gap-2">
        <h1 className="flex items-center text-3xl">
          Notifications
          <InformationCircleIcon
            className="h-6 w-6 ml-2 text-info stroke-2"
            data-tooltip-id="dashboard-overview"
          />
        </h1>
      </header>

      <FormProvider {...formMethods}>
        <section className="flex flex-wrap items-center justify-between gap-3">
          <NotificationsBulkActions notifications={notifications} />
          <DeleteNotificationButton ids={selectedIds} />
        </section>

        <Card title="">
          <NotificationTable notifications={notifications} />
        </Card>
      </FormProvider>
    </main>
  )
}
