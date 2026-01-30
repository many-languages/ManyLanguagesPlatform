"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import FeedbackCard from "./FeedbackCard"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

interface ResearcherFeedbackProps {
  studyId: number
  initialEnrichedResult: EnrichedJatosStudyResult | null | undefined
  template: { content: string } | null | undefined
  initialAllEnrichedResults: EnrichedJatosStudyResult[]
  requiredVariableKeyList?: string[]
}

export default function ResearcherFeedback({
  studyId,
  initialEnrichedResult,
  template,
  initialAllEnrichedResults,
  requiredVariableKeyList,
}: ResearcherFeedbackProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const handleRefresh = async () => {
    startTransition(() => {
      router.refresh()
    })
  }

  if (!template) return null

  return (
    <FeedbackCard
      studyId={studyId}
      enrichedResult={initialEnrichedResult}
      template={template}
      title="Feedback Preview"
      allEnrichedResults={initialAllEnrichedResults}
      requiredVariableKeyList={requiredVariableKeyList}
      onRefresh={handleRefresh}
      showEditButton={true}
    />
  )
}
