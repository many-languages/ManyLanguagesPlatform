"use client"

import { useEffect, useState, useTransition, useCallback, useRef } from "react"
import FeedbackCard from "./FeedbackCard"
import { checkParticipantCompletionAction } from "../../actions/checkParticipantCompletion"
import { fetchParticipantFeedbackAction } from "../../actions/fetchParticipantFeedback"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { useWindowResumeCheck } from "@/src/hooks/useWindowResumeCheck"

interface ParticipantFeedbackProps {
  studyId: number
  pseudonym: string
  jatosStudyId: number
  initialEnrichedResult: EnrichedJatosStudyResult | null | undefined
  template: { content: string } | null | undefined
  initialAllEnrichedResults: EnrichedJatosStudyResult[]
}

export default function ParticipantFeedback({
  studyId,
  pseudonym,
  jatosStudyId,
  initialEnrichedResult,
  template,
  initialAllEnrichedResults,
}: ParticipantFeedbackProps) {
  const [, startTransition] = useTransition()
  const [enrichedResult, setEnrichedResult] = useState(initialEnrichedResult)
  const [allEnrichedResults, setAllEnrichedResults] = useState(initialAllEnrichedResults)
  const isCheckingRef = useRef(false)

  // Update state when props change (syncs with server data after refresh)
  useEffect(() => {
    setEnrichedResult(initialEnrichedResult)
    setAllEnrichedResults(initialAllEnrichedResults)
  }, [initialEnrichedResult, initialAllEnrichedResults])

  // Lightweight check - only checks completion status (for auto-checks)
  const checkCompletionStatus = useCallback(
    async (showLoading = true) => {
      if (isCheckingRef.current) return

      if (showLoading) {
        isCheckingRef.current = true
      }

      try {
        const checkResult = await checkParticipantCompletionAction(studyId, pseudonym, jatosStudyId)

        if (!checkResult.success) {
          console.error("Failed to check completion status:", checkResult.error)
          return
        }

        // If not completed, no need to fetch full data
        if (!checkResult.completed) {
          return
        }

        // Results exist, fetch full data
        const fetchResult = await fetchParticipantFeedbackAction(studyId, pseudonym, jatosStudyId)

        if (!fetchResult.success) {
          console.error("Failed to fetch feedback data:", fetchResult.error)
          return
        }

        if (fetchResult.completed && fetchResult.data) {
          // Update local state directly (no router.refresh() needed)
          startTransition(() => {
            setEnrichedResult(fetchResult.data!.enrichedResult)
            setAllEnrichedResults(fetchResult.data!.allEnrichedResults)
          })
        }
      } catch (error) {
        console.error("Failed to check for new results:", error)
      } finally {
        if (showLoading) {
          isCheckingRef.current = false
        }
      }
    },
    [studyId, pseudonym, jatosStudyId, startTransition]
  )

  // Full fetch - always fetches complete data (for manual refresh)
  const fetchFullData = useCallback(async () => {
    if (isCheckingRef.current) return

    isCheckingRef.current = true

    try {
      const result = await fetchParticipantFeedbackAction(studyId, pseudonym, jatosStudyId)

      if (!result.success) {
        console.error("Failed to fetch feedback data:", result.error)
        return
      }

      if (result.completed && result.data) {
        // Update local state directly (no router.refresh() needed)
        startTransition(() => {
          setEnrichedResult(result.data!.enrichedResult)
          setAllEnrichedResults(result.data!.allEnrichedResults)
        })
      } else if (result.success && !result.completed && result.data) {
        // No results yet, but update state to reflect empty state
        startTransition(() => {
          setEnrichedResult(null)
          setAllEnrichedResults([])
        })
      }
    } catch (error) {
      console.error("Failed to fetch feedback data:", error)
    } finally {
      isCheckingRef.current = false
    }
  }, [studyId, pseudonym, jatosStudyId, startTransition])

  // Smart auto-checking: Only set up event listeners if no results exist yet
  const handleResumeCheck = useCallback(() => {
    return checkCompletionStatus(false)
  }, [checkCompletionStatus])

  useWindowResumeCheck({
    enabled: !enrichedResult,
    onResume: handleResumeCheck,
  })

  if (!template) return null

  return (
    <FeedbackCard
      studyId={studyId}
      enrichedResult={enrichedResult}
      template={template}
      allEnrichedResults={allEnrichedResults}
      onRefresh={fetchFullData}
    />
  )
}
