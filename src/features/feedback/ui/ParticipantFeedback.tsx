"use client"

import FeedbackCard from "./FeedbackCard"
import { useParticipantFeedbackSync } from "../hooks/useParticipantFeedbackSync"

interface ParticipantFeedbackProps {
  studyId: number
  pseudonym: string
  jatosStudyId: number
  initialCompleted: boolean
  initialRenderedMarkdown: string | null
  initialMatchingResponseCount: number
  initialSelectedResponseEndDate: number | null
  /** Feedback hidden until researcher fixes template vs codebook privacy (see `maintained` load kind). */
  initialFeedbackMaintained: boolean
  /** The participant's run started in JATOS but did not finish (single-run link used up). */
  sessionInterrupted?: boolean
}

export default function ParticipantFeedback({
  studyId,
  pseudonym,
  jatosStudyId,
  initialCompleted,
  initialRenderedMarkdown,
  initialMatchingResponseCount,
  initialSelectedResponseEndDate,
  initialFeedbackMaintained,
  sessionInterrupted = false,
}: ParticipantFeedbackProps) {
  const {
    completed,
    feedbackMaintained,
    feedbackMaintainedMessage,
    renderedMarkdown,
    matchingResponseCount,
    selectedResponseEndDate,
    fetchFullData,
  } = useParticipantFeedbackSync({
    studyId,
    pseudonym,
    jatosStudyId,
    initialCompleted,
    initialRenderedMarkdown,
    initialMatchingResponseCount,
    initialSelectedResponseEndDate,
    initialFeedbackMaintained,
  })

  return (
    <FeedbackCard
      studyId={studyId}
      renderedMarkdown={renderedMarkdown}
      feedbackMessage={feedbackMaintained ? feedbackMaintainedMessage : undefined}
      feedbackTone={feedbackMaintained ? "info" : undefined}
      participantCompleted={completed}
      participantSessionInterrupted={sessionInterrupted}
      participantMatchingResponseCount={matchingResponseCount}
      participantSelectedResponseEndDate={selectedResponseEndDate}
      onRefresh={fetchFullData}
    />
  )
}
