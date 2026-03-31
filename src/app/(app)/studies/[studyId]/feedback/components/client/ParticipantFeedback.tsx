"use client"

import { useEffect, useState, useTransition, useCallback, useRef } from "react"
import toast from "react-hot-toast"
import FeedbackCard from "./FeedbackCard"
import { checkParticipantCompletionAction } from "../../actions/checkParticipantCompletion"
import { fetchParticipantFeedbackAction } from "../../actions/fetchParticipantFeedback"
import type { LoadParticipantFeedbackPipelineResult } from "../../types"
import {
  PARTICIPANT_FEEDBACK_RSC_NO_TEMPLATE,
  PARTICIPANT_FEEDBACK_RSC_NOT_ENROLLED,
  PARTICIPANT_FEEDBACK_RSC_SIGN_IN,
} from "../../utils/participantFeedbackRscMessages"
import { useWindowResumeCheck } from "@/src/app/hooks/useWindowResumeCheck"

interface ParticipantFeedbackProps {
  studyId: number
  pseudonym: string
  jatosStudyId: number
  initialCompleted: boolean
  initialRenderedMarkdown: string | null
  initialMatchingResponseCount: number
  initialSelectedResponseEndDate: number | null
}

export default function ParticipantFeedback({
  studyId,
  pseudonym,
  jatosStudyId,
  initialCompleted,
  initialRenderedMarkdown,
  initialMatchingResponseCount,
  initialSelectedResponseEndDate,
}: ParticipantFeedbackProps) {
  const [, startTransition] = useTransition()
  const [completed, setCompleted] = useState(initialCompleted)
  const [renderedMarkdown, setRenderedMarkdown] = useState(initialRenderedMarkdown)
  const [matchingResponseCount, setMatchingResponseCount] = useState(initialMatchingResponseCount)
  const [selectedResponseEndDate, setSelectedResponseEndDate] = useState<number | null>(
    initialSelectedResponseEndDate
  )
  const isCheckingRef = useRef(false)

  useEffect(() => {
    setCompleted(initialCompleted)
    setRenderedMarkdown(initialRenderedMarkdown)
    setMatchingResponseCount(initialMatchingResponseCount)
    setSelectedResponseEndDate(initialSelectedResponseEndDate)
  }, [
    initialCompleted,
    initialRenderedMarkdown,
    initialMatchingResponseCount,
    initialSelectedResponseEndDate,
  ])

  const applyParticipantFeedbackPipelineResult = useCallback(
    (result: LoadParticipantFeedbackPipelineResult) => {
      if (result.kind === "not_authenticated") {
        toast.error(PARTICIPANT_FEEDBACK_RSC_SIGN_IN)
        return
      }
      if (result.kind === "not_enrolled") {
        toast.error(PARTICIPANT_FEEDBACK_RSC_NOT_ENROLLED)
        return
      }
      if (result.kind === "no_template") {
        toast.error(PARTICIPANT_FEEDBACK_RSC_NO_TEMPLATE)
        return
      }

      const loaded = result.loaded
      if (loaded.kind === "failed") {
        toast.error(loaded.error)
        return
      }

      startTransition(() => {
        if (loaded.kind === "loaded") {
          setCompleted(true)
          setRenderedMarkdown(loaded.renderedMarkdown)
          setMatchingResponseCount(loaded.matchingResponseCount)
          setSelectedResponseEndDate(loaded.selectedResponseEndDate)
        } else {
          setCompleted(false)
          setRenderedMarkdown(null)
          setMatchingResponseCount(0)
          setSelectedResponseEndDate(null)
        }
      })
    },
    [startTransition]
  )

  const checkCompletionStatus = useCallback(
    async (showLoading = true) => {
      if (isCheckingRef.current) return

      if (showLoading) {
        isCheckingRef.current = true
      }

      try {
        const checkResult = await checkParticipantCompletionAction(studyId, pseudonym, jatosStudyId)

        if (!checkResult.success) {
          toast.error(checkResult.error ?? "Could not check whether your study is complete.")
          return
        }

        if (!checkResult.completed) {
          return
        }

        const fetchResult = await fetchParticipantFeedbackAction(studyId, pseudonym, jatosStudyId)
        applyParticipantFeedbackPipelineResult(fetchResult)
      } catch (error) {
        console.error("Failed to check for new results:", error)
        toast.error("Something went wrong. Please try again.")
      } finally {
        if (showLoading) {
          isCheckingRef.current = false
        }
      }
    },
    [studyId, pseudonym, jatosStudyId, applyParticipantFeedbackPipelineResult]
  )

  const fetchFullData = useCallback(async () => {
    if (isCheckingRef.current) return

    isCheckingRef.current = true

    try {
      const result = await fetchParticipantFeedbackAction(studyId, pseudonym, jatosStudyId)
      applyParticipantFeedbackPipelineResult(result)
    } catch (error) {
      console.error("Failed to fetch feedback data:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      isCheckingRef.current = false
    }
  }, [studyId, pseudonym, jatosStudyId, applyParticipantFeedbackPipelineResult])

  const handleResumeCheck = useCallback(() => {
    return checkCompletionStatus(false)
  }, [checkCompletionStatus])

  useWindowResumeCheck({
    enabled: !completed,
    onResume: handleResumeCheck,
  })

  return (
    <FeedbackCard
      studyId={studyId}
      renderedMarkdown={renderedMarkdown}
      participantCompleted={completed}
      participantMatchingResponseCount={matchingResponseCount}
      participantSelectedResponseEndDate={selectedResponseEndDate}
      onRefresh={fetchFullData}
    />
  )
}
