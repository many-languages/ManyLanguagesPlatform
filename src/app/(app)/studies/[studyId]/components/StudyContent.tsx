"use client"

import { useQuery } from "@blitzjs/rpc"
import Card from "src/app/components/Card"
import Link from "next/link"
import { formatDate } from "@/src/app/utils/formatDate"
import getUserStudyMembership from "../../queries/getUserStudyMembership"
import { StudyWithRelations } from "../../queries/getStudy"
import ArchiveStudyButton from "../../components/ArchiveStudyButton"
import { ArchiveBoxIcon } from "@heroicons/react/24/outline"

interface StudyContentProps {
  study: StudyWithRelations
}

export default function StudyContent({ study }: StudyContentProps) {
  const [membership] = useQuery(getUserStudyMembership, { id: study.id })

  return (
    <main>
      <h1 className="text-3xl font-bold text-center mb-6">
        <span className="inline-flex items-center gap-2">
          {study?.archived && (
            <ArchiveBoxIcon
              className="h-6 w-6"
              title="Archived study"
              aria-label="Archived study"
            />
          )}
          {study?.title}
        </span>
      </h1>
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
    </main>
  )
}
