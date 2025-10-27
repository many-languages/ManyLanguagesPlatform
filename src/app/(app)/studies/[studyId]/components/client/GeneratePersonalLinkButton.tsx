"use client"

import { ParticipantStudy } from "db"
import { useState } from "react"
import toast from "react-hot-toast"

interface GeneratePersonalLinkButtonProps {
  participants: ParticipantStudy[]
  jatosBatchId: number
  jatosStudyId: number // ✅ correct name
}

/**
 * Generates individual PersonalSingle links (with participant pseudonym as comment)
 * for each participant via /api/jatos/create-single-personal-link.
 */
export default function GeneratePersonalLinkButton({
  participants,
  jatosBatchId,
  jatosStudyId,
}: GeneratePersonalLinkButtonProps) {
  const [links, setLinks] = useState<{ participantId: number; runUrl: string }[]>([])
  const [loading, setLoading] = useState(false)

  const handleGenerateLinks = async () => {
    if (participants.length === 0) {
      toast.error("No participants found.")
      return
    }

    setLoading(true)
    const newLinks: { participantId: number; runUrl: string }[] = []

    try {
      for (const participant of participants) {
        const res = await fetch("/api/jatos/create-single-personal-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studyId: jatosStudyId,
            batchId: jatosBatchId,
            type: "ps",
            comment: participant.pseudonym,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to generate link")

        newLinks.push({
          participantId: participant.id,
          runUrl: data.runUrl,
        })
      }

      setLinks(newLinks)
      toast.success("Personalized links generated successfully!")
    } catch (err: any) {
      console.error("Error generating JATOS links:", err)
      toast.error(err.message || "Unexpected error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleGenerateLinks}
        className={`btn btn-primary ${loading ? "loading" : ""}`}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Personalized Links"}
      </button>

      {links.length > 0 && (
        <div className="mt-2 space-y-2">
          <h4 className="font-semibold">Generated Links</h4>
          <ul className="list-disc ml-5 text-sm">
            {links.map((link) => (
              <li key={link.participantId}>
                <a href={link.runUrl} target="_blank" rel="noopener noreferrer" className="link">
                  Participant {link.participantId}: {link.runUrl}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
