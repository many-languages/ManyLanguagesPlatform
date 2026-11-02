/**
 * Public surface for the feedback feature (templates, DSL, participant/researcher views).
 * See `docs/refactor/studies-feature-migration.md` §5.
 */
export * from "./types"
export * from "./validations"
export { useFeedbackTemplate } from "./hooks/useFeedbackTemplate"
export type { UseFeedbackTemplateOptions } from "./hooks/useFeedbackTemplate"

export { default as FeedbackCard } from "./ui/FeedbackCard"
export { default as FeedbackFormEditor } from "./ui/FeedbackFormEditor"
export { default as FeedbackStepEditor } from "./ui/FeedbackStepEditor"
export type { FeedbackStepEditorProps, FeedbackStepEditorState } from "./ui/FeedbackStepEditor"

// Server loaders, server components and server actions live in `./index.server.ts`;
// only erased types are re-exported here.
export type { FeedbackStep6Data } from "./server/loadFeedbackStep6Data"
