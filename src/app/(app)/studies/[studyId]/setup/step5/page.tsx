import { notFound } from "next/navigation"
import CodebookContent from "../../codebook/components/client/CodebookContent"
import SetupStepHeader from "../components/client/SetupStepHeader"
import { getCodebookDataRsc } from "../../codebook/queries/getCodebookData"

import { getStudyRsc } from "../../../queries/getStudy"

async function Step5ContentWrapper({ studyId }: { studyId: number }) {
  const { variables, codebook, approvedExtractionId, approvedExtractionApprovedAt } =
    await getCodebookDataRsc(studyId)

  const study = await getStudyRsc(studyId)

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
                missingKeys: (codebook.missingKeys as string[]) ?? [],
                extraKeys: (codebook.extraKeys as string[]) ?? [],
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
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  return <Step5ContentWrapper studyId={studyId} />
}
