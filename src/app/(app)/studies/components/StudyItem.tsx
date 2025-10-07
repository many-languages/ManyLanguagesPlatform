import { Study } from "db"
import CollapseCard from "@/src/app/components/CollapseCard"
import Link from "next/link"
import { ArchiveBoxIcon } from "@heroicons/react/24/outline"
import JoinStudyButton from "./JoinStudyButton"

interface StudyItemProps {
  study: Pick<
    Study,
    | "id"
    | "title"
    | "description"
    | "sampleSize"
    | "length"
    | "endDate"
    | "jatosStudyUUID"
    | "jatosStudyId"
    | "jatosWorkerType"
    | "jatosBatchId"
    | "archived"
  >
  showJoinButton?: boolean
}

export default function StudyItem({ study, showJoinButton }: StudyItemProps) {
  return (
    <CollapseCard
      title={
        <span className="flex items-center gap-2">
          {study.archived && <ArchiveBoxIcon className="h-5 w-5" />}
          {study.title}
        </span>
      }
      tooltipContent={study.archived ? "Study is archived" : ""}
      className="mb-4"
      actions={
        <>
          <Link className="btn btn-primary" href={`/studies/${study.id}`}>
            Open
          </Link>
          {showJoinButton && (
            <JoinStudyButton
              studyId={study.id}
              jatosStudyId={study.jatosStudyId}
              jatosBatchId={study.jatosBatchId!}
              jatosWorkerType={study.jatosWorkerType}
            />
          )}
        </>
      }
    >
      <div className="space-y-2">
        {/* Description */}
        {study.description && <p className="text-sm text-base-content/80">{study.description}</p>}

        {/* Participants needed */}
        <p>
          <span className="font-semibold">Participants required:</span> {study.sampleSize}
        </p>

        {/* Study length */}
        <p>
          <span className="font-semibold">Expected length:</span> {study.length}
        </p>

        {/* End date */}
        <p>
          <span className="font-semibold">End date:</span>{" "}
          {new Date(study.endDate).toLocaleDateString()}
        </p>
      </div>
    </CollapseCard>
  )
}
