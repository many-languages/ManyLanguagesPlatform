"use client"

import { ArrowDownTrayIcon } from "@heroicons/react/24/outline"
import toast from "react-hot-toast"
import { downloadResultsAction } from "../../actions/results"
import { AsyncButton } from "@/src/app/components/AsyncButton"

interface DownloadResultsButtonProps {
  studyId: number
}

export default function DownloadResultsButton({ studyId }: DownloadResultsButtonProps) {
  const handleDownload = async () => {
    toast.loading("Preparing results...", { id: "download" })

    try {
      const result = await downloadResultsAction(studyId)
      if (!result.success) {
        toast.error(result.error, { id: "download" })
        return
      }

      const { filename, mimeType, base64 } = result.payload
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      toast.success("Results downloaded", { id: "download" })
    } catch (err) {
      console.error(err)
      toast.error("Error downloading results", { id: "download" })
    }
  }

  return (
    <AsyncButton
      onClick={handleDownload}
      loadingText="Downloading"
      className="btn btn-accent inline-flex items-center gap-2"
    >
      <ArrowDownTrayIcon className="h-5 w-5" />
      Download All Results (ZIP archive)
    </AsyncButton>
  )
}
