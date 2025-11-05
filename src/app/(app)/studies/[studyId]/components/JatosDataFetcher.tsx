import { ParticipantWithEmail } from "../../queries/getStudyParticipants"
import JatosDataContentServer from "./JatosDataContentServer"

interface JatosDataFetcherProps {
  jatosStudyId: number
  jatosStudyUUID: string
  participants: ParticipantWithEmail[]
}

export default function JatosDataFetcher(props: JatosDataFetcherProps) {
  return <JatosDataContentServer {...props} />
}
