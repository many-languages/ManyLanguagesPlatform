"use client"

import { useMutation, useQuery } from "@blitzjs/rpc"
import joinStudy from "../../mutations/joinStudy"
import toast from "react-hot-toast"
import isParticipantInStudy from "../../queries/isParticipantInStudy"
import saveJatosRunUrl from "../../[studyId]/setup/mutations/saveJatosRunUrl"
import { createPersonalStudyCodeAndSave } from "@/src/lib/jatos/api/createPersonalStudyCodeAndSave"
import { AsyncButton } from "@/src/app/components/AsyncButton"
import { useRouter } from "next/navigation"

interface JoinStudyButtonProps {
  studyId: number
  jatosStudyId: number
  jatosBatchId: number
  jatosWorkerType: "SINGLE" | "MULTIPLE"
}

export default function JoinStudyButton({
  studyId,
  jatosStudyId,
  jatosBatchId,
  jatosWorkerType,
}: JoinStudyButtonProps) {
  const router = useRouter()
  const [{ joined } = { joined: false }] = useQuery(isParticipantInStudy, { studyId })
  const [joinStudyMutation] = useMutation(joinStudy)
  const [saveJatosRunUrlMutation] = useMutation(saveJatosRunUrl)

  const handleJoin = async () => {
    // 1) Join the study (creates ParticipantStudy entry)
    const participant = await joinStudyMutation({ studyId })
    const { id: participantStudyId, pseudonym } = participant

    // 2) Create personal study code and save run URL
    const type = jatosWorkerType === "MULTIPLE" ? "pm" : "ps"
    await createPersonalStudyCodeAndSave({
      jatosStudyId,
      jatosBatchId,
      type,
      comment: pseudonym,
      onSave: async (runUrl) => {
        await saveJatosRunUrlMutation({ participantStudyId, jatosRunUrl: runUrl })
      },
    })

    toast.success("You have joined the study!")
    router.push(`/studies/${studyId}`)
  }

  return (
    <AsyncButton
      onClick={handleJoin}
      loadingText="Joining"
      disabled={joined}
      className={`${joined ? "btn-disabled" : "btn-primary"}`}
    >
      {joined ? "Already Joined" : "Join Study"}
    </AsyncButton>
  )
}
