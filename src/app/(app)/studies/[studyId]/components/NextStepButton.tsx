"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

interface NextStepButtonProps {
  studyId: number
  nextStep: number
  label?: string
}

export default function NextStepButton({
  studyId,
  nextStep,
  label = "Next step",
}: NextStepButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleNext = async () => {
    setLoading(true)
    try {
      router.push(`/studies/${studyId}/setup/step${nextStep}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`btn btn-secondary mt-6 ${loading ? "loading" : ""}`}
      onClick={handleNext}
      disabled={loading}
    >
      {loading ? "Loading..." : label}
    </button>
  )
}
