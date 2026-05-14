import type { ParticipantManagementCardProps } from "../../types"
import ParticipantManagementCardClient from "./ParticipantManagementCardClient"

export type { ParticipantManagementCardProps } from "../../types"

export default function ParticipantManagementCard(props: ParticipantManagementCardProps) {
  return <ParticipantManagementCardClient {...props} />
}
