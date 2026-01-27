import { notFound } from "next/navigation"
import CodebookContent from "../../codebook/components/client/CodebookContent"
import SaveExitButton from "../components/client/SaveExitButton"
import { getCodebookDataRsc } from "../../codebook/queries/getCodebookData"

async function Step5ContentWrapper({ studyId }: { studyId: number }) {
  const { variables, codebook, approvedExtractionId, approvedExtractionApprovedAt } =
    await getCodebookDataRsc(studyId)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SaveExitButton />
        <h2 className="text-xl font-semibold text-center flex-1">Step 5 – Codebook</h2>
        <div className="w-32" /> {/* Spacer to balance the layout */}
      </div>
      <CodebookContent
        initialVariables={variables}
        codebook={codebook}
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
