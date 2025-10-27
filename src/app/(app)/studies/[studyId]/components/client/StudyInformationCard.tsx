"use client"

import Card from "@/src/app/components/Card"
import Link from "next/link"
import { formatDate } from "@/src/lib/utils/formatDate"
import { StudyWithRelations } from "../../../queries/getStudy"
import ArchiveStudyButton from "../../../components/client/ArchiveStudyButton"
import { useSession } from "@blitzjs/auth"

interface StudyInformationCardProps {
  study: StudyWithRelations
}

export default function StudyInformationCard({ study }: StudyInformationCardProps) {
  const { role } = useSession()

  return (
    <Card
      title="Study Information"
      actions={
        role === "RESEARCHER" && (
          <div className="card-actions justify-end mt-4">
            <Link className="btn btn-primary" href={`/studies/${study.id}/edit`}>
              Update
            </Link>
            <ArchiveStudyButton studyId={study.id} isArchived={study.archived} />
          </div>
        )
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
        <span className="font-semibold">Ethical Permission:</span>{" "}
        <a
          href={study.ethicalPermission}
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          View
        </a>
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
