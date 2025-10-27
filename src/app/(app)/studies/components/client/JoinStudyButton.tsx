"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@blitzjs/rpc"
import joinStudy from "../../mutations/joinStudy"
import toast from "react-hot-toast"
import isParticipantInStudy from "../../queries/isParticipantInStudy"
import saveJatosRunUrl from "../../[studyId]/setup/mutations/saveJatosRunUrl"
import { generateJatosRunUrl } from "@/src/lib/jatos/api/generateJatosRunUrl"
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
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    setLoading(true)
    try {
      // 1) Join the study (creates ParticipantStudy entry)
      const participant = await joinStudyMutation({ studyId })
      const { id: participantStudyId, pseudonym } = participant

      // 2) Create a personal study code on JATOS
      const type = jatosWorkerType === "MULTIPLE" ? "pm" : "ps"
      const res = await fetch("/api/jatos/create-personal-studycode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jatosStudyId,
          jatosBatchId,
          type,
          comment: pseudonym,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create study code")

      const code = json.code
      const runUrl = generateJatosRunUrl(code)

      // 3) Save the generated runUrl to ParticipantStudy
      await saveJatosRunUrlMutation({ participantStudyId, jatosRunUrl: runUrl })

      toast.success("You have joined the study!")
      router.push(`/studies/${studyId}`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message ?? "Failed to join study")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`btn ${joined ? "btn-disabled" : "btn-secondary"} ${loading ? "loading" : ""}`}
      onClick={handleJoin}
      disabled={joined || loading}
    >
      {joined ? "Already Joined" : "Join Study"}
    </button>
  )
}
