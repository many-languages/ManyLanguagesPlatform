"use client"

import { useQuery } from "@blitzjs/rpc"
import Card from "src/app/components/Card"
import Link from "next/link"
import { formatDate } from "@/src/app/utils/formatDate"
import getUserStudyMembership from "../../queries/getUserStudyMembership"
import { StudyWithRelations } from "../../queries/getStudy"
import ArchiveStudyButton from "../../components/ArchiveStudyButton"

interface StudyInformationCardProps {
  study: StudyWithRelations
}

export default function StudyInformationCard({ study }: StudyInformationCardProps) {
  const [membership] = useQuery(getUserStudyMembership, { id: study.id })

  return (
    <Card
      title="Study Information"
      actions={
        membership &&
        membership.kind === "RESEARCHER" && (
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
    </Card>
  )
}
