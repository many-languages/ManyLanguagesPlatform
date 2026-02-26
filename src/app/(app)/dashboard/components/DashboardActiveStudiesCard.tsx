import Link from "next/link"
import { SignalIcon } from "@heroicons/react/24/outline"
import Card from "@/src/app/components/Card"
import type { ActiveStudyWithResponseCount } from "../queries/getActiveStudiesWithResponseCounts"

interface DashboardActiveStudiesCardProps {
  studies: ActiveStudyWithResponseCount[]
}

export default function DashboardActiveStudiesCard({ studies }: DashboardActiveStudiesCardProps) {
  return (
    <Card title="Active data collection" bgColor="bg-base-300">
      <div className="flex flex-col gap-4">
        {studies.map((study) => {
          const percentage =
            study.sampleSize > 0
              ? Math.min(100, Math.round((study.responseCount / study.sampleSize) * 100))
              : 0

          return (
            <Link
              key={study.id}
              href={`/studies/${study.id}`}
              className="flex flex-col gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-base-content/70">
                  <SignalIcon className="inline h-5 w-5 mr-1" />
                </span>
                <span className="flex-1 text-sm font-medium truncate">{study.title}</span>
              </div>
              <div
                className="tooltip tooltip-top w-full"
                data-tip={`${study.responseCount} / ${study.sampleSize}`}
              >
                <progress
                  className="progress progress-primary w-full"
                  value={percentage}
                  max={100}
                />
              </div>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
