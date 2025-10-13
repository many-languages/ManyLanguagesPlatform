"use client"

import { useQuery } from "@blitzjs/rpc"
import { useParams, useRouter } from "next/navigation"
import getResearcherRunUrl from "../../../queries/getResearcherRunUrl"
import getStudy from "../../../queries/getStudy"
import GenerateTestLinkButton from "../../components/GenerateTestLinkButton"
import RunStudyButton from "../../components/studyComponent/RunStudyButton"
import NextStepButton from "../../components/NextStepButton"

export default function Step3Page() {
  const router = useRouter()
  const params = useParams()
  const studyId = Number(params.id)

  const [{ id: studyResearcherId, jatosRunUrl } = {}, { isLoading: researcherLoading }] = useQuery(
    getResearcherRunUrl,
    { studyId }
  )

  const [study, { isLoading: studyLoading }] = useQuery(getStudy, { id: studyId })

  const handleGenerated = () => {
    window.location.reload() // refresh to pick up new runUrl
  }

  if (researcherLoading || studyLoading) {
    return <p>Loading...</p>
  }

  if (!study) {
    return <p className="text-error">Study not found.</p>
  }

  if (!studyResearcherId) {
    return <p className="text-error">You are not assigned as a researcher to this study.</p>
  }

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Step 3 – Test run</h2>

      {!jatosRunUrl ? (
        <GenerateTestLinkButton
          studyResearcherId={studyResearcherId}
          jatosStudyId={study.jatosStudyId!}
          jatosBatchId={study.jatosBatchId!}
          onGenerated={handleGenerated}
        />
      ) : (
        <>
          <p className="mb-2 text-sm opacity-70">
            Use the button below to run your imported study in JATOS.
          </p>
          <RunStudyButton runUrl={jatosRunUrl} />
          <NextStepButton studyId={study.id} nextStep={4} label="Continue to Step 4" />
        </>
      )}
    </>
  )
}
