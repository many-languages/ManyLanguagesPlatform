import { FolderOpenIcon } from "@heroicons/react/24/outline"
import type { StudyWithLatestUpload } from "../../types"
import StudyItem from "./StudyItem"

interface StudyListProps {
  studies: Pick<
    StudyWithLatestUpload,
    | "id"
    | "title"
    | "description"
    | "sampleSize"
    | "length"
    | "endDate"
    | "archived"
    | "latestJatosStudyUpload"
  >[]
  showJoinButton?: boolean
  showOpenButton?: boolean
  /** When false, replaces the join button with a "View Details" link. Defaults to true. */
  isParticipant?: boolean
  /** Server-loaded join flags keyed by study id (Explore). */
  joinedByStudyId?: Record<number, boolean>
  /** Overrides the default empty-state heading. Use when the caller knows the active filter. */
  emptyMessage?: string
}

export default function StudyList({
  studies,
  showJoinButton,
  showOpenButton,
  isParticipant = true,
  joinedByStudyId,
  emptyMessage,
}: StudyListProps) {
  if (!studies || studies.length === 0) {
    const defaultHeading = showJoinButton ? "No studies available to join" : "No studies yet"
    const defaultBody = showJoinButton
      ? "Check back later — new studies are added regularly."
      : "Your studies will appear here once you create one."

    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-base-content/50">
        <FolderOpenIcon className="h-12 w-12" />
        <div className="text-center space-y-1">
          <p className="text-lg font-medium text-base-content/70">
            {emptyMessage ?? defaultHeading}
          </p>
          {!emptyMessage && <p className="text-sm">{defaultBody}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {studies.map((study) => (
        <StudyItem
          key={study.id}
          study={study}
          showJoinButton={showJoinButton}
          showOpenButton={showOpenButton}
          isParticipant={isParticipant}
          initialJoined={joinedByStudyId?.[study.id] ?? false}
        />
      ))}
    </div>
  )
}
