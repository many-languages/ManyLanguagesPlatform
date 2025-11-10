"use client"

import { useMemo } from "react"
import { createColumnHelper } from "@tanstack/react-table"
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid"
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline"

import Table from "../../../../components/Table"
import DateFormat from "../../../../components/DateFormat"
import NotificationMessage from "./NotificationMessage"
import ReadToggle from "./ReadToggle"
import { PinToggle } from "./PinToggle"
import { SelectCheckbox, SelectAllCheckbox } from "../../../../components/fields/SelectCheckbox"
import { NotificationWithRecipient } from "../../types"
import { parseRouteData } from "../../utils/parseRouteData"

type NotificationRow = {
  notificationId: number
  createdAt: Date
  message: string
  routeData: ReturnType<typeof parseRouteData>
  pinned: boolean
  recipient: NotificationWithRecipient
}

const columnHelper = createColumnHelper<NotificationRow>()

type NotificationTableProps = {
  notifications: NotificationWithRecipient[]
}

export const NotificationTable = ({ notifications }: NotificationTableProps) => {
  const rows = useMemo<NotificationRow[]>(() => {
    return notifications.map((recipient) => ({
      notificationId: recipient.notificationId,
      createdAt: recipient.notification.createdAt,
      message: recipient.notification.message,
      routeData: parseRouteData(recipient.notification.routeData),
      pinned: recipient.pinned,
      recipient,
    }))
  }, [notifications])

  const allIds = useMemo(() => rows.map((row) => row.notificationId), [rows])

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: () => <SelectAllCheckbox values={allIds} />,
        cell: (info) => <SelectCheckbox value={info.row.original.notificationId} />,
      }),
      columnHelper.accessor("createdAt", {
        header: "Received",
        cell: (info) => <DateFormat date={info.getValue()} />,
      }),
      columnHelper.display({
        id: "message",
        header: "Message",
        cell: (info) => (
          <NotificationMessage
            message={info.row.original.message}
            routeData={info.row.original.routeData}
          />
        ),
      }),
      columnHelper.display({
        id: "pinned",
        header: "Pinned",
        cell: (info) => <PinToggle recipient={info.row.original.recipient} />,
      }),
      columnHelper.display({
        id: "readToggle",
        header: "Read",
        cell: (info) => <ReadToggle recipient={info.row.original.recipient} />,
      }),
    ],
    [allIds]
  )

  return <Table columns={columns} data={rows} addPagination />
}
