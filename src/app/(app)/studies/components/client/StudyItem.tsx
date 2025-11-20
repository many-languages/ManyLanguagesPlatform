import { Study } from "db"
import CollapseCard from "../CollapseCard"
import JoinStudyButton from "./JoinStudyButton"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import { ArchiveBoxIcon } from "@heroicons/react/24/outline"

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
  showOpenButton?: boolean
}

export default function StudyItem({
  study,
  showJoinButton,
  showOpenButton = true,
}: StudyItemProps) {
  const { jatosStudyId, jatosBatchId, jatosWorkerType } = study
  const canJoinStudy =
    Boolean(showJoinButton) &&
    jatosStudyId !== null &&
    jatosBatchId !== null &&
    jatosWorkerType !== null

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
          {showOpenButton && (
            <NavigationButton
              href={`/studies/${study.id}`}
              pendingText="Opening"
              className="btn-primary"
            >
              Open
            </NavigationButton>
          )}
          {canJoinStudy && (
            <JoinStudyButton
              studyId={study.id}
              jatosStudyId={jatosStudyId}
              jatosBatchId={jatosBatchId}
              jatosWorkerType={jatosWorkerType}
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
