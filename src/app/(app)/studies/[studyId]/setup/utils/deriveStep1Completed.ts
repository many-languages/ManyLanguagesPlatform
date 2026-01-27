type StudyInfoForStep1 = {
  title?: string | null
  description?: string | null
}

export function deriveStep1Completed(study: StudyInfoForStep1): boolean {
  return Boolean(study.title && study.description)
}
