import type { StudyWithLatestUpload } from "../../queries/getStudies"
import CollapseCard from "../CollapseCard"
import JoinStudyButton from "./JoinStudyButton"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import { ArchiveBoxIcon } from "@heroicons/react/24/outline"

interface StudyItemProps {
  study: Pick<
    StudyWithLatestUpload,
    | "id"
    | "title"
    | "description"
    | "sampleSize"
    | "length"
    | "endDate"
    | "archived"
    | "latestJatosStudyUpload"
  >
  showJoinButton?: boolean
  showOpenButton?: boolean
}

export default function StudyItem({
  study,
  showJoinButton,
  showOpenButton = true,
}: StudyItemProps) {
  const latestUpload = study.latestJatosStudyUpload
  const joinData =
    latestUpload &&
    latestUpload.jatosStudyId != null &&
    latestUpload.jatosBatchId != null &&
    latestUpload.jatosWorkerType != null
      ? {
          jatosStudyId: latestUpload.jatosStudyId,
          jatosBatchId: latestUpload.jatosBatchId,
          jatosWorkerType: latestUpload.jatosWorkerType,
        }
      : null
  const canJoinStudy = Boolean(showJoinButton) && joinData !== null

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
              jatosStudyId={joinData!.jatosStudyId}
              jatosBatchId={joinData!.jatosBatchId}
              jatosWorkerType={joinData!.jatosWorkerType}
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
