import type { StudyWithLatestUpload } from "../../queries/getStudies"
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
}

export default function StudyList({ studies, showJoinButton, showOpenButton }: StudyListProps) {
  if (!studies || studies.length === 0) {
    return <p className="text-base-content/70 italic">No studies available at the moment.</p>
  }

  return (
    <div className="space-y-4">
      {studies.map((study) => (
        <StudyItem
          key={study.id}
          study={study}
          showJoinButton={showJoinButton}
          showOpenButton={showOpenButton}
        />
      ))}
    </div>
  )
}
