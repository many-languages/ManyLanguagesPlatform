"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@blitzjs/rpc"
import getStudy from "../queries/getStudy"
import Card from "src/app/components/Card"
import { useCurrentUser } from "src/app/users/hooks/useCurrentUser"
import Link from "next/link"

export default function StudyPage() {
  const params = useParams()
  const studyId = Number(params?.studyId)

  const [study] = useQuery(getStudy, { id: studyId })
  const currentUser = useCurrentUser()

  const isResearcher = currentUser && study?.researchers?.some((r) => r.userId === currentUser.id)

  if (!study) {
    return (
      <main>
        <h1 className="text-2xl font-bold text-center mt-8">Study not found</h1>
      </main>
    )
  }

  return (
    <main>
      {/* Title */}
      <h1 className="text-3xl font-bold text-center mb-6">{study.title}</h1>

      {/* Basic info */}
      <Card
        title="Study Information"
        actions={
          isResearcher && (
            <div className="card-actions justify-end mt-4">
              <Link className="btn btn-primary" href={`/studies/${study.id}/edit`}>
                Update Study
              </Link>
            </div>
          )
        }
      >
        <p>
          <span className="font-semibold">Description:</span>{" "}
          {study.description || "No description provided."}
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
          <span className="font-semibold">Start Date:</span>{" "}
          {new Date(study.startDate).toLocaleDateString()}
        </p>
        <p>
          <span className="font-semibold">End Date:</span>{" "}
          {new Date(study.endDate).toLocaleDateString()}
        </p>
      </Card>
    </main>
  )
}
