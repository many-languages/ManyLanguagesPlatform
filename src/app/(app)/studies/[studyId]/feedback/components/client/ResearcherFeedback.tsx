"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import FeedbackCard from "./FeedbackCard"
import type { FeedbackCardTone } from "../../types"

interface ResearcherFeedbackProps {
  studyId: number
  renderedMarkdown: string | null
  researcherHasPilotData: boolean
  /** Plain message in place of markdown; whole card uses `feedbackTone`. */
  feedbackMessage?: string
  feedbackTone?: FeedbackCardTone
}

export default function ResearcherFeedback({
  studyId,
  renderedMarkdown,
  researcherHasPilotData,
  feedbackMessage,
  feedbackTone,
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
      feedbackMessage={feedbackMessage}
      feedbackTone={feedbackTone}
      title="Feedback Preview"
      researcherHasPilotData={researcherHasPilotData}
      onRefresh={handleRefresh}
      showEditButton={true}
    />
  )
}
