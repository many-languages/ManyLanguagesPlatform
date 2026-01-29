import { notFound } from "next/navigation"
import Step6Content from "./components/client/Step6Content"
import SaveExitButton from "../components/client/SaveExitButton"
import { getFeedbackTemplateRsc } from "../../feedback/queries/getFeedbackTemplate"
import { getAllPilotResultsRsc } from "../../utils/getAllPilotResults"
import { getCodebookDataRsc } from "../../codebook/queries/getCodebookData"

import { getStudyRsc } from "../../../queries/getStudy"

async function Step6ContentWrapper({ studyId }: { studyId: number }) {
  // Fetch feedback template server-side
  const feedbackTemplate = await getFeedbackTemplateRsc(studyId)

  // Master Query: Reuse the optimized getStudyRsc
  // This now includes pilotLinks and approvedExtraction details due to our 'getStudy.ts' update
  const study = await getStudyRsc(studyId)

  const latestUploadWithExtraction = study.latestJatosStudyUpload
  const approvedExtraction = latestUploadWithExtraction?.approvedExtraction ?? null

  const jatosStudyId = latestUploadWithExtraction?.jatosStudyId ?? null
  const markerTokens =
    latestUploadWithExtraction?.pilotLinks.map((link) => link.markerToken).filter(Boolean) ?? []

  // Optimize: Pass the context to skip internal DB lookups
  const allPilotResults =
    jatosStudyId && markerTokens.length > 0
      ? await getAllPilotResultsRsc(studyId, {
          jatosStudyId,
          markerTokens,
        })
      : []

  const enrichedResult = allPilotResults[0] ?? null
  const pilotResultId = enrichedResult?.id ?? null

  const { variables } = await getCodebookDataRsc(studyId)

  const filteredVariables = variables.filter((v: any) => !v.personalData)
  const hiddenVariables = variables
    .filter((v: any) => v.personalData)
    .map((v: any) => v.variableName)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SaveExitButton studyId={studyId} />
        <h2 className="text-xl font-semibold text-center flex-1">Step 6 – Feedback</h2>
        <div className="w-32" /> {/* Spacer to balance the layout */}
      </div>
      <Step6Content
        study={study}
        initialFeedbackTemplate={
          feedbackTemplate
            ? {
                ...feedbackTemplate,
                missingKeys: (feedbackTemplate.missingKeys as string[]) ?? [],
                extraKeys: (feedbackTemplate.extraKeys as string[]) ?? [],
              }
            : null
        }
        approvedExtractionId={approvedExtraction?.id ?? null}
        approvedExtractionApprovedAt={approvedExtraction?.approvedAt ?? null}
        enrichedResult={enrichedResult}
        allPilotResults={allPilotResults}
        pilotResultId={pilotResultId}
        variables={filteredVariables.map((v: any) => ({
          variableName: v.variableName,
          type: v.type,
          variableKey: v.variableKey,
        }))}
        hiddenVariables={hiddenVariables}
      />
    </>
  )
}

export default async function Step6Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  return <Step6ContentWrapper studyId={studyId} />
}
