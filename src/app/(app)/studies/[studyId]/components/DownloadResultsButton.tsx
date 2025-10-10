"use client"

import { useState } from "react"
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline"
import toast from "react-hot-toast"

interface DownloadResultsButtonProps {
  jatosStudyId: number
}

export default function DownloadResultsButton({ jatosStudyId }: DownloadResultsButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    toast.loading("Preparing results...", { id: "download" })

    try {
      const res = await fetch(`/api/jatos/get-all-results?studyIds=${jatosStudyId}`, {
        method: "POST",
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || "Failed to download results")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = `study_${jatosStudyId}_results.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast.success("Results downloaded", { id: "download" })
    } catch (err) {
      console.error(err)
      toast.error("Error downloading results", { id: "download" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="btn btn-accent inline-flex items-center gap-2"
    >
      <ArrowDownTrayIcon className="h-5 w-5" />
      {loading ? "Downloading..." : "Download All Results (ZIP archive)"}
    </button>
  )
}
