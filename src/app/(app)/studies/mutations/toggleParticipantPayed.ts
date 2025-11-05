import db from "db"
import { resolver } from "@blitzjs/rpc"
import { ToggleParticipantPayed } from "../validations"

export default resolver.pipe(
  resolver.zod(ToggleParticipantPayed),
  resolver.authorize("RESEARCHER"),
  async ({ participantIds, makePayed }) => {
    if (participantIds.length === 0) {
      throw new Error("No participants selected.")
    }

    const updated = await db.participantStudy.updateMany({
      where: { id: { in: participantIds } },
      data: { payed: makePayed },
    })

    return updated
  }
)
