import { notFound } from "next/navigation"
import Step6Content from "./components/client/Step6Content"
import SaveExitButton from "../components/client/SaveExitButton"
import { getFeedbackTemplateRsc } from "../../feedback/queries/getFeedbackTemplate"
import { getStudyVariablesRsc } from "../../variables/queries/getStudyVariables"
import { getPilotResultByIdRsc } from "../../utils/getPilotResultById"
import db from "db"

async function Step6ContentWrapper({ studyId }: { studyId: number }) {
  // Fetch feedback template server-side
  const feedbackTemplate = await getFeedbackTemplateRsc(studyId)

  const study = await db.study.findUnique({
    where: { id: studyId },
    select: {
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          approvedExtraction: {
            select: {
              id: true,
              approvedAt: true,
              pilotDatasetSnapshot: {
                select: { pilotRunIds: true },
              },
            },
          },
        },
      },
    },
  })

  const latestUpload = study?.jatosStudyUploads[0] ?? null

  const approvedExtraction = latestUpload?.approvedExtraction ?? null
  const pilotResultId =
    Array.isArray(latestUpload?.approvedExtraction?.pilotDatasetSnapshot?.pilotRunIds) &&
    latestUpload?.approvedExtraction?.pilotDatasetSnapshot?.pilotRunIds.length
      ? (latestUpload?.approvedExtraction?.pilotDatasetSnapshot?.pilotRunIds[0] as number)
      : null

  const enrichedResult = pilotResultId ? await getPilotResultByIdRsc(studyId, pilotResultId) : null

  const allPilotResults = enrichedResult ? [enrichedResult] : []
  const variables = await getStudyVariablesRsc(studyId)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SaveExitButton />
        <h2 className="text-xl font-semibold text-center flex-1">Step 6 – Feedback</h2>
        <div className="w-32" /> {/* Spacer to balance the layout */}
      </div>
      <Step6Content
        initialFeedbackTemplate={feedbackTemplate}
        approvedExtractionId={approvedExtraction?.id ?? null}
        approvedExtractionApprovedAt={approvedExtraction?.approvedAt ?? null}
        enrichedResult={enrichedResult}
        allPilotResults={allPilotResults}
        pilotResultId={pilotResultId}
        variables={variables.map((v) => ({
          variableName: v.variableName,
          type: v.type,
          variableKey: v.variableKey,
        }))}
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
