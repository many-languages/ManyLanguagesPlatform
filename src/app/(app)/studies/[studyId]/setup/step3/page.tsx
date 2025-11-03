import { Suspense } from "react"
import StepPageWrapper from "../components/StepPageWrapper"
import Step3Content from "./components/client/Step3Content"
import { getResearcherRunUrlRsc } from "../queries/getResearcherRunUrl"
import SetupContentSkeleton from "../components/SetupContentSkeleton"
import { StudyWithRelations } from "../../../queries/getStudy"

async function Step3DataFetcher({
  studyId,
  study,
}: {
  studyId: number
  study: StudyWithRelations
}) {
  const researcher = await getResearcherRunUrlRsc(studyId).catch(() => null)

  return (
    <Step3Content
      study={study}
      studyId={studyId}
      researcherId={researcher?.id ?? null}
      jatosRunUrl={researcher?.jatosRunUrl ?? null}
    />
  )
}

export default function Step3Page() {
  return (
    <StepPageWrapper>
      {(study, studyId) => (
        <>
          <h2 className="text-lg font-semibold mb-4 text-center">Step 3 – Test run</h2>
          <Suspense fallback={<SetupContentSkeleton />}>
            <Step3DataFetcher studyId={studyId} study={study} />
          </Suspense>
        </>
      )}
    </StepPageWrapper>
  )
}
