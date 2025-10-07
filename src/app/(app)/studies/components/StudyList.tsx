import { Study } from "db"
import StudyItem from "./StudyItem"

interface StudyListProps {
  studies: Pick<
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
  >[]
  showJoinButton?: boolean
}

export default function StudyList({ studies, showJoinButton }: StudyListProps) {
  if (!studies || studies.length === 0) {
    return <p className="text-base-content/70 italic">No studies available at the moment.</p>
  }

  return (
    <div className="space-y-4">
      {studies.map((study) => (
        <StudyItem key={study.id} study={study} showJoinButton={showJoinButton} />
      ))}
    </div>
  )
}
