export const PARTICIPANT_STUDY_VIEWS = [
  "all",
  "completed",
  "not_completed",
  "completed_not_paid",
] as const
export type ParticipantStudyView = (typeof PARTICIPANT_STUDY_VIEWS)[number]

export function parseParticipantStudyView(value: string | undefined): ParticipantStudyView {
  if (value && PARTICIPANT_STUDY_VIEWS.includes(value as ParticipantStudyView)) {
    return value as ParticipantStudyView
  }
  return "all"
}
