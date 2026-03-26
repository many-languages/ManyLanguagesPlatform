"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import FeedbackCard from "./FeedbackCard"

interface ResearcherFeedbackProps {
  studyId: number
  renderedMarkdown: string | null
  researcherHasPilotData: boolean
}

export default function ResearcherFeedback({
  studyId,
  renderedMarkdown,
  researcherHasPilotData,
}: ResearcherFeedbackProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const handleRefresh = async () => {
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <FeedbackCard
      studyId={studyId}
      renderedMarkdown={renderedMarkdown}
      title="Feedback Preview"
      researcherHasPilotData={researcherHasPilotData}
      onRefresh={handleRefresh}
      showEditButton={true}
    />
  )
}
