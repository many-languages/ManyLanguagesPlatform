import ResultsCard from "./ResultsCard"
import type { ResultsCardProps } from "../../types"

export type ResultsCardWrapperProps = ResultsCardProps

export default function ResultsCardWrapper(props: ResultsCardWrapperProps) {
  return <ResultsCard {...props} />
}
