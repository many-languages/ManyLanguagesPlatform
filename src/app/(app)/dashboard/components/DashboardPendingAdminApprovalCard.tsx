"use client"

import Link from "next/link"
import Card from "@/src/app/components/Card"
import type { PendingAdminApprovalStudyRow } from "@/src/app/(admin)/admin/studies/queries/getPendingAdminApprovalStudies"

function formatWaitingSinceLine(value: PendingAdminApprovalStudyRow["feedbackTemplateCreatedAt"]) {
  const start = new Date(value).getTime()
  if (Number.isNaN(start)) {
    return "Waiting since —"
  }

  const ms = Math.max(0, Date.now() - start)
  const totalMinutes = Math.floor(ms / 60_000)
  const totalHours = ms / 3_600_000
  const fullDays = Math.floor(totalHours / 24)
  const hoursInPartialDay = Math.floor(totalHours % 24)

  if (fullDays < 1) {
    const wholeHours = Math.floor(totalHours)
    if (wholeHours < 1) {
      if (totalMinutes < 1) {
        return "Waiting since less than a minute"
      }
      return `Waiting since ${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""}`
    }
    return `Waiting since ${wholeHours} hour${wholeHours !== 1 ? "s" : ""}`
  }

  return `Waiting since ${fullDays} day${fullDays !== 1 ? "s" : ""} and ${hoursInPartialDay} hour${
    hoursInPartialDay !== 1 ? "s" : ""
  }`
}

export default function DashboardPendingAdminApprovalCard({
  studies,
}: {
  studies: PendingAdminApprovalStudyRow[]
}) {
  return (
    <Card title="Studies awaiting approval" bgColor="bg-base-300">
      <p className="text-sm text-base-content/70 mb-3">
        Setup is complete and these studies are waiting for admin review. Sorted by urgency.
      </p>
      {studies.length === 0 ? (
        <p className="text-base-content/70">No studies waiting for approval right now.</p>
      ) : (
        <ul className="space-y-2">
          {studies.map((study) => (
            <li key={study.id}>
              <Link
                href="/admin/studies"
                className="block rounded-lg bg-base-200/80 px-3 py-2 hover:bg-base-200 transition-colors"
              >
                <div className="font-medium truncate">{study.title}</div>
                <div className="text-xs text-base-content/60">
                  {formatWaitingSinceLine(study.feedbackTemplateCreatedAt)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
