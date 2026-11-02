// Server-only entry point. Do not import from client components — see `./index.ts` for the client-safe surface.
export { default as ResearcherFeedbackData } from "./ui/ResearcherFeedbackData"
export { default as ParticipantFeedbackData } from "./ui/ParticipantFeedbackData"

export { getFeedbackTemplateRsc } from "./server/getFeedbackTemplate"
export { getFeedbackStep6DataRsc } from "./server/loadFeedbackStep6Data"
export { computeFeedbackTemplateValidation } from "./server/computeFeedbackTemplateValidation"
export { getPersonalDataViolationsForPersistedTemplate } from "./server/feedbackTemplatePersonalDataViolations"
export { saveFeedbackTemplateAction } from "./actions/saveFeedbackTemplate"
export { renderFeedbackPreviewAction } from "./actions/renderFeedbackPreviewAction"
export { fetchParticipantFeedbackAction } from "./actions/fetchParticipantFeedback"
export { checkParticipantCompletionAction } from "./actions/checkParticipantCompletion"
