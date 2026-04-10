import CodebookContent from "../../codebook/components/client/CodebookContent"
import SetupStepHeader from "../components/client/SetupStepHeader"
import { getCodebookDataRsc } from "../../codebook/queries/getCodebookData"
import { loadStudySetupPage } from "../utils/loadStudySetupPage"
import type { StudyWithRelations } from "@/src/app/(app)/studies/queries/getStudy"

async function Step5ContentWrapper({ study }: { study: StudyWithRelations }) {
  const studyId = study.id
  const { variables, codebook, approvedExtractionId, approvedExtractionApprovedAt } =
    await getCodebookDataRsc(studyId)

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 5 – Codebook" />
      <CodebookContent
        study={study}
        initialVariables={variables.map((v) => ({
          ...v,
          examples: (v.examples as { value: string; sourcePath: string }[] | null) ?? [],
        }))}
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

  return <Step5ContentWrapper study={study} />
}
