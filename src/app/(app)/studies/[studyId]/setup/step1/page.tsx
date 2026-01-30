import { notFound } from "next/navigation"
import Step1Content from "./components/client/Step1Content"
import SetupStepHeader from "../components/client/SetupStepHeader"
import { getStudyRsc } from "../../../queries/getStudy"

export default async function Step1Page({
  params,
  searchParams,
}: {
  params: Promise<{ studyId: string }>
  searchParams: Promise<{ edit?: string; returnTo?: string }>
}) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)
  const searchParamsValue = await searchParams
  const isEditMode = searchParamsValue.edit === "true"
  const returnTo = searchParamsValue.returnTo || "step2"

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  const study = await getStudyRsc(studyId)

  return (
    <>
      <SetupStepHeader
        studyId={studyId}
        title="Step 1 – General information"
        showSaveExit={false}
      />
      <Step1Content study={study} studyId={studyId} isEditMode={isEditMode} returnTo={returnTo} />
    </>
  )
}
