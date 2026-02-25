export const STUDY_VIEWS = ["all", "active", "archived", "incomplete"] as const
export type StudyView = (typeof STUDY_VIEWS)[number]

export function parseStudyView(value: string | undefined): StudyView {
  if (value && STUDY_VIEWS.includes(value as StudyView)) {
    return value as StudyView
  }
  return "all"
}
