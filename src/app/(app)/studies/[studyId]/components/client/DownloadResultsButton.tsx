"use client"

import { ArrowDownTrayIcon } from "@heroicons/react/24/outline"
import toast from "react-hot-toast"
import { downloadBlob } from "@/src/lib/jatos/api/downloadBlob"
import { AsyncButton } from "@/src/app/components/AsyncButton"

interface DownloadResultsButtonProps {
  jatosStudyId: number
}

export default function DownloadResultsButton({ jatosStudyId }: DownloadResultsButtonProps) {
  const handleDownload = async () => {
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
    }
  }

  return (
    <AsyncButton
      onClick={handleDownload}
      loadingText="Downloading..."
      className="btn btn-accent inline-flex items-center gap-2"
    >
      <ArrowDownTrayIcon className="h-5 w-5" />
      Download All Results (ZIP archive)
    </AsyncButton>
  )
}
