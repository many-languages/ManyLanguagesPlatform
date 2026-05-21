"use client"

import { useState } from "react"
import { useMutation } from "@blitzjs/rpc"
import joinStudy from "@/src/features/studies/mutations/joinStudy"
import toast from "react-hot-toast"
import { createParticipantStudyCodeAndSaveAction } from "@/src/features/studies/actions/createParticipantStudyCode"
import { AsyncButton } from "@/src/components/ui/AsyncButton"
import { useRouter } from "next/navigation"

interface JoinStudyButtonProps {
  studyId: number
  jatosStudyId: number
  jatosBatchId: number
  jatosWorkerType: "SINGLE" | "MULTIPLE"
  initialJoined?: boolean
}

export default function JoinStudyButton({
  studyId,
  jatosStudyId,
  jatosBatchId,
  jatosWorkerType,
  initialJoined = false,
}: JoinStudyButtonProps) {
  const router = useRouter()
  const [joined, setJoined] = useState(initialJoined)
  const [joinStudyMutation] = useMutation(joinStudy)

  const handleJoin = async () => {
    // 1) Join the study (creates ParticipantStudy entry)
    const participant = await joinStudyMutation({ studyId })
    const { id: participantStudyId, pseudonym } = participant

    // 2) Create personal study code and save run URL
    const type = jatosWorkerType === "MULTIPLE" ? "pm" : "ps"
    await createParticipantStudyCodeAndSaveAction({
      studyId,
      jatosStudyId,
      jatosBatchId,
      type,
      comment: pseudonym,
      participantStudyId,
    })

    setJoined(true)
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
