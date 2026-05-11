import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { PARTICIPANT_STUDY_VIEWS } from "../domain/participantStudyView"
import { getParticipantStudiesWithStatus } from "../server/getParticipantStudiesWithStatus"

const GetParticipantStudiesWithStatus = z.object({
  view: z.enum(PARTICIPANT_STUDY_VIEWS).default("all"),
  page: z.number().int().nonnegative(),
  itemsPerPage: z.number().int().positive().max(100),
})

export default resolver.pipe(
  resolver.zod(GetParticipantStudiesWithStatus),
  resolver.authorize(),
  async ({ view, page, itemsPerPage }) => {
    return getParticipantStudiesWithStatus(view, page, itemsPerPage)
  }
)
