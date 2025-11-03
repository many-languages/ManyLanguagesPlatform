import StepPageWrapper from "../components/StepPageWrapper"
import Step1Content from "./components/client/Step1Content"

export default function Step1Page() {
  return (
    <StepPageWrapper>
      {(study, studyId) => (
        <>
          <h2 className="text-lg font-semibold mb-4 text-center">Step 1 – General information</h2>
          <Step1Content study={study} studyId={studyId} />
        </>
      )}
    </StepPageWrapper>
  )
}
