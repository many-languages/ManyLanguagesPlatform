import { Suspense } from "react"
import Step3Content from "./components/client/Step3Content"
import SetupContentSkeleton from "../components/skeletons/SetupContentSkeleton"

export default function Step3Page() {
  return (
    <>
      <h2 className="text-lg font-semibold mb-4 text-center">Step 3 – Test run</h2>
      <Suspense fallback={<SetupContentSkeleton />}>
        <Step3Content />
      </Suspense>
    </>
  )
}
