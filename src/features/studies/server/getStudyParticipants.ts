import { cache } from "react"
import db from "db"
import { participantWithEmailArgs } from "../studySelects"
import type { ParticipantWithEmail } from "../types"
import { withStudyAccess } from "./withStudyAccess"

async function findStudyParticipants(studyId: number): Promise<ParticipantWithEmail[]> {
  return db.participantStudy.findMany({
    where: { studyId },
    orderBy: { createdAt: "asc" },
    ...participantWithEmailArgs,
  })
}

export const getStudyParticipantsRsc = cache(async (studyId: number) => {
  return withStudyAccess(studyId, async () => {
    return findStudyParticipants(studyId)
  })
})
