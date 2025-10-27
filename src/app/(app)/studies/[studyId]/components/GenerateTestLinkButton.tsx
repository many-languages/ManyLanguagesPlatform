"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { generateAndSaveResearcherTestRunUrl } from "../utils/generateResearcherTestRunUrl"

interface GenerateTestLinkButtonProps {
  studyResearcherId: number
  jatosStudyId: number
  jatosBatchId: number
  onGenerated?: (runUrl: string) => void
}

export default function GenerateTestLinkButton({
  studyResearcherId,
  jatosStudyId,
  jatosBatchId,
  onGenerated,
}: GenerateTestLinkButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (loading) return
    setLoading(true)
    try {
      const runUrl = await generateAndSaveResearcherTestRunUrl({
        studyResearcherId,
        jatosStudyId,
        jatosBatchId,
      })

      toast.success("Test link generated successfully!")
      onGenerated?.(runUrl)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message ?? "Failed to generate test link")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`btn btn-primary ${loading ? "loading" : ""}`}
      onClick={handleGenerate}
      disabled={loading}
    >
      {loading ? "Generating..." : "Generate Test Link"}
    </button>
  )
}
