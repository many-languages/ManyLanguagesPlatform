import Card from "@/src/app/components/Card"
import Link from "next/link"
import { formatDate } from "@/src/lib/utils/formatDate"
import { StudyWithRelations } from "../../../queries/getStudy"
import ArchiveStudyButton from "../../../components/client/ArchiveStudyButton"

interface StudyInformationCardProps {
  study: StudyWithRelations
  userRole: "RESEARCHER" | "PARTICIPANT"
}

export default function StudyInformationCard({ study, userRole }: StudyInformationCardProps) {
  return (
    <Card
      title="Study Information"
      collapsible
      className="mt-4"
      actions={
        userRole === "RESEARCHER" ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              className="btn btn-primary"
              href={`/studies/${study.id}/setup/step1?edit=true&returnTo=study`}
            >
              Update
            </Link>
            <ArchiveStudyButton studyId={study.id} isArchived={study.archived} />
          </div>
        ) : undefined
      }
    >
      <p>
        <span className="font-semibold">Description:</span> {study.description}
      </p>
      <p>
        <span className="font-semibold">Sample Size:</span> {study.sampleSize}
      </p>
      <p>
        <span className="font-semibold">Length:</span> {study.length}
      </p>
      <p>
        <span className="font-semibold">Payment:</span> {study.payment}
      </p>
      <p>
        <span className="font-semibold">Start Date:</span> {formatDate(study.startDate)}
      </p>
      <p>
        <span className="font-semibold">End Date:</span> {formatDate(study.endDate)}
      </p>
      <p>
        <span className="font-semibold">Data collection method:</span> {study.jatosWorkerType}
      </p>
    </Card>
  )
}
