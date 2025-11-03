import db from "db"
import { resolver } from "@blitzjs/rpc"
import { ToggleParticipantActive } from "../validations"

export default resolver.pipe(
  resolver.zod(ToggleParticipantActive),
  resolver.authorize("RESEARCHER"),
  async ({ participantIds, makeActive }) => {
    if (participantIds.length === 0) {
      throw new Error("No participants selected.")
    }

    const updated = await db.participantStudy.updateMany({
      where: { id: { in: participantIds } },
      data: { active: makeActive },
    })

    return updated
  }
)
