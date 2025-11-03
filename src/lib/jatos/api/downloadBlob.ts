/**
 * Client-side helper for downloading binary files (blobs) from API routes.
 *
 * Handles fetching a blob, creating a download link, triggering download, and cleanup.
 *
 * @example
 * ```ts
 * import { downloadBlob } from "@/src/lib/jatos/api/downloadBlob"
 *
 * await downloadBlob(
 *   `/api/jatos/get-all-results?studyIds=${jatosStudyId}`,
 *   `study_${jatosStudyId}_results.zip`,
 *   { method: "POST" }
 * )
 * ```
 */

import type { JatosApiError } from "@/src/types/jatos-api"

/**
 * Downloads a binary file from an API endpoint and triggers browser download.
 *
 * @param url - Full URL to fetch (including /api/jatos prefix if needed)
 * @param filename - Suggested filename for download
 * @param options - Optional fetch options
 * @throws Error if download fails
 */
export async function downloadBlob(
  url: string,
  filename: string,
  options?: RequestInit
): Promise<void> {
  const res = await fetch(url, options)

  if (!res.ok) {
    // Try to parse error response
    let errorMessage = "Failed to download file"
    try {
      const errorData = (await res.json()) as JatosApiError
      errorMessage = errorData.error || errorMessage
    } catch {
      // If parsing fails, use status text
      const text = await res.text()
      errorMessage = text || errorMessage
    }
    throw new Error(errorMessage)
  }

  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)

  // Create temporary download link
  const a = document.createElement("a")
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()

  // Cleanup
  a.remove()
  URL.revokeObjectURL(blobUrl)
}
