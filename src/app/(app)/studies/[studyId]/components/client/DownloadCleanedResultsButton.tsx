"use client"

import { ArrowDownTrayIcon } from "@heroicons/react/24/outline"
import toast from "react-hot-toast"
import { downloadCleanedResultsAction } from "../../actions/cleanedResultsDownload"
import { AsyncButton } from "@/src/app/components/AsyncButton"

interface DownloadCleanedResultsButtonProps {
  studyId: number
  /** When false, the button is disabled (e.g. no approved extraction or no results yet). */
  enabled: boolean
  disabledReason?: string
}

export default function DownloadCleanedResultsButton({
  studyId,
  enabled,
  disabledReason,
}: DownloadCleanedResultsButtonProps) {
  const handleDownload = async () => {
    toast.loading("Preparing cleaned CSV…", { id: "download-cleaned" })

    try {
      const result = await downloadCleanedResultsAction(studyId)
      if (!result.success) {
        toast.error(result.error, { id: "download-cleaned" })
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

      toast.success("Cleaned results downloaded", { id: "download-cleaned" })
    } catch (err) {
      console.error(err)
      toast.error("Error downloading cleaned results", { id: "download-cleaned" })
    }
  }

  const button = (
    <AsyncButton
      onClick={handleDownload}
      loadingText="Downloading"
      className="btn btn-primary inline-flex items-center gap-2"
      disabled={!enabled}
    >
      <ArrowDownTrayIcon className="h-5 w-5" />
      Download cleaned results (CSV)
    </AsyncButton>
  )

  if (!enabled && disabledReason) {
    return (
      <span className="tooltip tooltip-top inline-block" data-tip={disabledReason}>
        <span className="inline-block">{button}</span>
      </span>
    )
  }

  return button
}
