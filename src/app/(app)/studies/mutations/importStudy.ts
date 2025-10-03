import { importStudyJzip } from "@/src/app/server/jatos/studies"
import { resolver } from "@blitzjs/rpc"

export type ImportStudyResult = {
  jatosStudyId: number
  jatosUUID?: string
  jatosFileName: string
}

export default resolver.pipe(
  resolver.authorize("RESEARCHER"),
  async (input: { buffer: Buffer; filename: string }): Promise<ImportStudyResult> => {
    const { buffer, filename } = input
    const jatosRes = await importStudyJzip(buffer, filename)
    return {
      jatosStudyId: jatosRes.id,
      jatosUUID: jatosRes.uuid,
      jatosFileName: filename,
    }
  }
)
