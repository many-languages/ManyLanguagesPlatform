"use client"

import { useParams, useRouter } from "next/navigation"
import FeedbackFormEditor from "../../components/FeedbackFormEditor"
import { useQuery } from "@blitzjs/rpc"
import getStudyDataByComment from "../../../queries/getStudyDataByComment"

export default function Step4Page() {
  //   const router = useRouter()
  const params = useParams()
  const studyId = Number(params.id)

  const [data, { isLoading, error }] = useQuery(getStudyDataByComment, {
    studyId,
    comment: "test",
  })

  if (isLoading) return <p>Loading results...</p>
  if (error) return <p className="text-error">Error: {error.message}</p>

  if (!data?.enrichedResult) {
    return <p className="text-warning">No test run data found.</p>
  }

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Step 4 – Feedback</h2>
      <FeedbackFormEditor enrichedResult={data.enrichedResult} />
    </>
  )
}
