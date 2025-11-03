"use client"

import { useState } from "react"
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline"
import toast from "react-hot-toast"
import { downloadBlob } from "@/src/lib/jatos/api/downloadBlob"

interface DownloadResultsButtonProps {
  jatosStudyId: number
}

export default function DownloadResultsButton({ jatosStudyId }: DownloadResultsButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    toast.loading("Preparing results...", { id: "download" })

    try {
      await downloadBlob(
        `/api/jatos/get-all-results?studyIds=${jatosStudyId}`,
        `study_${jatosStudyId}_results.zip`,
        { method: "POST" }
      )
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
