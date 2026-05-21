import { Suspense } from "react"
import {
  Step5Content,
  SetupStepHeader,
  SetupContentSkeleton,
  loadStudySetupPage,
  type StudyWithRelations,
} from "@/src/features/studies"
import { getCodebookDataRsc } from "@/src/features/codebook"

async function Step5ContentWrapper({ study }: { study: StudyWithRelations }) {
  const studyId = study.id
  const { variables, groups, codebook, approvedExtractionId, approvedExtractionApprovedAt } =
    await getCodebookDataRsc(studyId)

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 5 – Codebook" />
      <Step5Content
        study={study}
        initialVariables={variables.map((v) => ({
          ...v,
          examples: (v.examples as { value: string; sourcePath: string }[] | null) ?? [],
        }))}
        initialGroups={groups}
        codebook={
          codebook
            ? {
                ...codebook,
                missingKeys: codebook.missingKeys ?? [],
                extraKeys: codebook.extraKeys ?? [],
              }
            : null
        }
        approvedExtractionId={approvedExtractionId}
        approvedExtractionApprovedAt={approvedExtractionApprovedAt}
      />
    </>
  )
}

export default async function Step5Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { study } = await loadStudySetupPage(params)

  return (
    <Suspense fallback={<SetupContentSkeleton />}>
      <Step5ContentWrapper study={study} />
    </Suspense>
  )
}
