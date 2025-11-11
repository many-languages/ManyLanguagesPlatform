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
import { StudyWithRelations } from "../../../queries/getStudy"
import ArchiveStudyButton from "../../../components/client/ArchiveStudyButton"
import { NavigationButton } from "@/src/app/components/NavigationButton"

interface StudyInformationCardProps {
  study: StudyWithRelations
  userRole: "RESEARCHER" | "PARTICIPANT"
}

export default function StudyInformationCard({ study, userRole }: StudyInformationCardProps) {
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

  return (
    <Card
      title="Study Information"
      collapsible
      className="mt-4"
      actions={
        userRole === "RESEARCHER" ? (
          <div className="flex flex-wrap justify-end gap-2">
            <NavigationButton
              href={`/studies/${study.id}/setup/step1?edit=true&returnTo=study`}
              className="btn-primary"
              pendingText="Opening…"
            >
              Edit
            </NavigationButton>
            <ArchiveStudyButton studyId={study.id} isArchived={study.archived} />
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-base-content">
          {study.description?.trim().length ? study.description : "—"}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {statsItems.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start gap-3 rounded-lg bg-base-200/60 p-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <div className="text-sm font-medium text-base-content/70">{label}</div>
                <div className="text-base font-semibold leading-tight text-base-content">
                  {value}
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-start gap-3 rounded-lg bg-base-200/60 p-4">
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
