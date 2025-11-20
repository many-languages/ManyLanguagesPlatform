import Card from "@/src/app/components/Card"
import Link from "next/link"
import { formatDate } from "@/src/lib/utils/formatDate"
import {
  CalendarDaysIcon,
  CircleStackIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UsersIcon,
} from "@heroicons/react/24/outline"
import { CheckCircleIcon } from "@heroicons/react/24/solid"
import { StudyWithRelations } from "../../../queries/getStudy"
import { ReactNode } from "react"

interface StudyInformationCardProps {
  study: StudyWithRelations
  userRole: "RESEARCHER" | "PARTICIPANT"
  isPayed?: boolean
  actions?: ReactNode
}

export default function StudyInformationCard({
  study,
  userRole,
  isPayed,
  actions,
}: StudyInformationCardProps) {
  const statsItems = [
    {
      label: "Sample Size",
      value:
        typeof study.sampleSize === "number"
          ? new Intl.NumberFormat().format(study.sampleSize)
          : "—",
      icon: UsersIcon,
    },
    {
      label: "Length",
      value: study.length?.trim().length ? study.length : "—",
      icon: ClockIcon,
    },
    {
      label: "Payment",
      value: study.payment?.trim().length ? study.payment : "—",
      icon: CurrencyDollarIcon,
    },
    {
      label: "Start Date",
      value: study.startDate ? formatDate(study.startDate) : "—",
      icon: CalendarDaysIcon,
    },
    {
      label: "End Date",
      value: study.endDate ? formatDate(study.endDate) : "—",
      icon: CalendarDaysIcon,
    },
  ] as const

  const dataCollectionMethod =
    study.jatosWorkerType === "SINGLE"
      ? "single run"
      : study.jatosWorkerType === "MULTIPLE"
      ? "multiple run"
      : study.jatosWorkerType || "—"

  const dataCollectionMethodTooltip =
    study.jatosWorkerType === "SINGLE"
      ? "Participant can complete the study once"
      : study.jatosWorkerType === "MULTIPLE"
      ? "Participant can complete the study multiple times"
      : undefined

  return (
    <Card title="Study Information" collapsible className="mt-4" actions={actions}>
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-base-content">
          {study.description?.trim().length ? study.description : "—"}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {statsItems.map(({ label, value, icon: Icon }) => {
            const isPaymentField = label === "Payment"
            const showPaymentBadge = isPaymentField && userRole === "PARTICIPANT" && isPayed

            return (
              <div key={label} className="flex items-start gap-3 rounded-lg bg-base-200/60 p-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-base-content/70">{label}</div>
                    {showPaymentBadge && (
                      <span className="badge badge-success badge-sm" title="Payment received">
                        <CheckCircleIcon className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-base font-semibold leading-tight text-base-content">
                    {value}
                  </div>
                </div>
              </div>
            )
          })}

          <div
            className={`flex items-start gap-3 rounded-lg bg-base-200/60 p-4 ${
              dataCollectionMethodTooltip ? "tooltip tooltip-top" : ""
            }`}
            data-tip={dataCollectionMethodTooltip}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CircleStackIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="text-sm font-medium text-base-content/70">Data Collection Method</div>
              <div className="text-base font-semibold leading-tight text-base-content">
                {dataCollectionMethod}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
