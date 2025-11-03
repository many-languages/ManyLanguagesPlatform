import JatosDataContentServer from "./JatosDataContentServer"
import { ParticipantWithEmail } from "../../../queries/getStudyParticipants"

interface JatosDataFetcherProps {
  jatosStudyId: number
  jatosStudyUUID: string
  participants: ParticipantWithEmail[]
}

export default function JatosDataFetcher(props: JatosDataFetcherProps) {
  return <JatosDataContentServer {...props} />
}
