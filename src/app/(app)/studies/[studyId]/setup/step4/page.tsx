import { notFound } from "next/navigation"
import CodebookContent from "../../codebook/components/client/CodebookContent"
import SaveExitButton from "../components/client/SaveExitButton"
import { getStudyVariablesRsc } from "../../variables/queries/getStudyVariables"
import { syncVariablesFromTestResultsAction } from "../step3/actions/syncVariablesFromTestResults"
import db from "db"

async function Step4ContentWrapper({ studyId }: { studyId: number }) {
  // Check if step 3 is completed
  const study = await db.study.findUnique({
    where: { id: studyId },
    select: { step3Completed: true },
  })

  // If step 3 is completed but no variables exist, try to sync them
  let variables = await getStudyVariablesRsc(studyId)
  if (study?.step3Completed && variables.length === 0) {
    // Try to sync variables from test results
    const syncResult = await syncVariablesFromTestResultsAction(studyId)
    if (syncResult.success) {
      // Refetch variables after syncing
      variables = await getStudyVariablesRsc(studyId)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SaveExitButton />
        <h2 className="text-xl font-semibold text-center flex-1">Step 4 – Codebook</h2>
        <div className="w-32" /> {/* Spacer to balance the layout */}
      </div>
      <CodebookContent initialVariables={variables} />
    </>
  )
}

export default async function Step4Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  return <Step4ContentWrapper studyId={studyId} />
}
