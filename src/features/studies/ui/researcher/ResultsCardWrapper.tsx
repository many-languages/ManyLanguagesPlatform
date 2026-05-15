import { Suspense } from "react"
import ResultsCard from "./ResultsCard"
import type { ResultsCardProps } from "../../types"
import { LoadingMessage } from "@/src/components/ui/LoadingStates"

export type ResultsCardWrapperProps = ResultsCardProps

export default function ResultsCardWrapper(props: ResultsCardWrapperProps) {
  return (
    <Suspense fallback={<LoadingMessage message="Loading results..." />}>
      <ResultsCard {...props} />
    </Suspense>
  )
}
