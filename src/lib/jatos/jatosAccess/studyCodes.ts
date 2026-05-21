import { fetchStudyCodes } from "../client/fetchStudyCodes"
import { generateJatosRunUrl } from "../utils/generateJatosRunUrl"
import {
  withParticipantAccessAndResearcherToken,
  withResearcherAccess,
  assertJatosStudyBelongsToStudy,
  assertJatosUploadBelongsToStudy,
} from "./core"
import { getTokenForResearcher } from "../tokenBroker"

export async function createPersonalStudyCodeInternal(input: {
  token: string
  jatosStudyId: number
  jatosBatchId?: number
  type: "ps" | "pm"
  comment: string
  onSave: (runUrl: string) => Promise<void>
}): Promise<string> {
  const codes = await fetchStudyCodes(
    {
      studyId: input.jatosStudyId,
      type: input.type,
      amount: 1,
      batchId: input.jatosBatchId,
      comment: input.comment,
    },
    { token: input.token }
  )
  if (codes.length === 0) throw new Error("No study code found")
  const runUrl = generateJatosRunUrl(codes[0])
  await input.onSave(runUrl)
  return runUrl
}

export async function createPersonalStudyCodeForParticipant({
  studyId,
  userId,
  jatosStudyId,
  jatosBatchId,
  type,
  comment,
  participantStudyId,
  onSave,
}: {
  studyId: number
  userId: number
  jatosStudyId: number
  jatosBatchId?: number
  type: "ps" | "pm"
  comment: string
  participantStudyId?: number
  onSave: (runUrl: string) => Promise<void>
}): Promise<string> {
  return withParticipantAccessAndResearcherToken(
    { studyId, pseudonym: comment, userId, jatosStudyId, participantStudyId },
    async ({ jatosStudyId, token }) =>
      createPersonalStudyCodeInternal({
        token,
        jatosStudyId,
        jatosBatchId,
        type,
        comment,
        onSave,
      })
  )
}

export async function createPersonalStudyCodeForResearcher({
  studyId,
  userId,
  jatosStudyId,
  jatosStudyUploadId,
  jatosBatchId,
  type,
  comment,
  onSave,
}: {
  studyId: number
  userId: number
  jatosStudyId: number
  jatosStudyUploadId?: number
  jatosBatchId?: number
  type: "ps" | "pm"
  comment: string
  onSave: (runUrl: string) => Promise<void>
}): Promise<string> {
  return withResearcherAccess({ studyId, userId }, async ({ userId }) => {
    if (jatosStudyUploadId != null) {
      await assertJatosUploadBelongsToStudy({ studyId, jatosStudyUploadId, jatosStudyId })
    } else {
      await assertJatosStudyBelongsToStudy({ studyId, jatosStudyId })
    }

    const token = await getTokenForResearcher(userId)
    return createPersonalStudyCodeInternal({
      token,
      jatosStudyId,
      jatosBatchId,
      type,
      comment,
      onSave,
    })
  })
}

export async function getGeneralLinksForResearcher({
  studyId,
  userId,
  jatosStudyId,
  participants,
  type = "gs",
}: {
  studyId: number
  userId: number
  jatosStudyId: number
  participants: { id: number; pseudonym: string }[]
  type?: "gs" | "gm"
}): Promise<{
  type: string
  studyId: number
  baseCode: string
  baseRunUrl: string
  links: { participantId: number; pseudonym: string; runUrl: string }[]
}> {
  return withResearcherAccess({ studyId, userId }, async ({ userId }) => {
    await assertJatosStudyBelongsToStudy({ studyId, jatosStudyId })
    const token = await getTokenForResearcher(userId)
    const codes = await fetchStudyCodes({ studyId: jatosStudyId, type, amount: 1 }, { token })
    if (codes.length === 0) throw new Error("No general study code found")

    const baseRunUrl = generateJatosRunUrl(codes[0])
    const links = participants.map((p) => ({
      participantId: p.id,
      pseudonym: p.pseudonym,
      runUrl: `${baseRunUrl}?participantId=${encodeURIComponent(p.pseudonym)}`,
    }))

    return {
      type,
      studyId,
      baseCode: codes[0],
      baseRunUrl,
      links,
    }
  })
}
