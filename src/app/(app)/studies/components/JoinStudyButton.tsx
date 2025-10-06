"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@blitzjs/rpc"
import joinStudy from "../mutations/joinStudy"
import toast from "react-hot-toast"
import isParticipantInStudy from "../queries/isParticipantInStudy"

interface JoinStudyButtonProps {
  studyId: number
}

export default function JoinStudyButton({ studyId }: JoinStudyButtonProps) {
  const [{ joined } = { joined: false }, { refetch }] = useQuery(isParticipantInStudy, { studyId })
  const [joinStudyMutation] = useMutation(joinStudy)
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    setLoading(true)
    try {
      await joinStudyMutation({ studyId })
      toast.success("You have joined the study!")
      await refetch() // update query result
    } catch (err: any) {
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
