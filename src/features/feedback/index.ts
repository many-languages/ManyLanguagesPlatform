/**
 * Public surface for the feedback feature (templates, DSL, participant/researcher views).
 * See `docs/refactor/studies-feature-migration.md` §5.
 */
export * from "./types"
export * from "./validations"
export { useFeedbackTemplate } from "./hooks/useFeedbackTemplate"
export type { UseFeedbackTemplateOptions } from "./hooks/useFeedbackTemplate"

export { default as ResearcherFeedbackData } from "./ui/ResearcherFeedbackData"
export { default as ParticipantFeedbackData } from "./ui/ParticipantFeedbackData"
export { default as FeedbackCard } from "./ui/FeedbackCard"
export { default as FeedbackFormEditor } from "./ui/FeedbackFormEditor"
export { default as FeedbackStepEditor } from "./ui/FeedbackStepEditor"
export type { FeedbackStepEditorProps, FeedbackStepEditorState } from "./ui/FeedbackStepEditor"

export { getFeedbackTemplateRsc } from "./server/getFeedbackTemplate"
export { getFeedbackStep6DataRsc } from "./server/loadFeedbackStep6Data"
export type { FeedbackStep6Data } from "./server/loadFeedbackStep6Data"
export { computeFeedbackTemplateValidation } from "./server/computeFeedbackTemplateValidation"
export { getPersonalDataViolationsForPersistedTemplate } from "./server/feedbackTemplatePersonalDataViolations"
export { saveFeedbackTemplateAction } from "./actions/saveFeedbackTemplate"
export { renderFeedbackPreviewAction } from "./actions/renderFeedbackPreviewAction"
export { fetchParticipantFeedbackAction } from "./actions/fetchParticipantFeedback"
export { checkParticipantCompletionAction } from "./actions/checkParticipantCompletion"
