"use client"

import { useState } from "react"
import toast from "react-hot-toast"

interface GenerateLinkButtonProps {
  participantId: number
  pseudonym: string
  jatosBatchId: number
  studyCode: string // usually jatosStudyUUID or studyCode
}

export default function GenerateLinkButton({
  participantId,
  pseudonym,
  jatosBatchId,
  studyCode,
}: GenerateLinkButtonProps) {
  const [runUrl, setRunUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerateLink = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/jatos/create-personal-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: jatosBatchId,
          studyCode,
          pseudonym,
          participantId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate link")

      setRunUrl(data.runUrl)
      toast.success("Personalized link generated!")
    } catch (err: any) {
      console.error("Error generating JATOS link:", err)
      toast.error(err.message || "Unexpected error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleGenerateLink}
        className={`btn btn-primary ${loading ? "loading" : ""}`}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Personalized Link"}
      </button>

      {runUrl && (
        <div className="mt-2">
          <p className="text-sm">
            <span className="font-semibold">Run URL:</span>{" "}
            <a href={runUrl} target="_blank" rel="noopener noreferrer" className="link">
              {runUrl}
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
