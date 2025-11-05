/**
 * Client-side helper for fetching JATOS results data as a blob.
 *
 * Fetches results ZIP file from JATOS API for processing (parsing, analysis, etc.).
 *
 * @example
 * ```ts
 * import { fetchResultsBlob } from "@/src/lib/jatos/api/fetchResultsBlob"
 * import { parseJatosZip } from "@/src/lib/jatos/api/parseJatosZip"
 *
 * const blob = await fetchResultsBlob(jatosStudyId)
 * const files = await parseJatosZip(blob)
 * ```
 */

/**
 * Fetches results data as a blob from JATOS API.
 *
 * @param jatosStudyId - The JATOS study ID to fetch results for
 * @returns Blob containing the results ZIP file
 * @throws Error if fetch fails
 */
export async function fetchResultsBlob(jatosStudyId: number): Promise<Blob> {
  const res = await fetch(`/api/jatos/get-results-data?studyIds=${jatosStudyId}`, {
    method: "POST",
  })

  if (!res.ok) {
    let errorMessage = `Failed to fetch results: ${res.status}`
    try {
      const errorData = (await res.json()) as { error?: string }
      errorMessage = errorData.error || errorMessage
    } catch {
      const text = await res.text()
      errorMessage = text || errorMessage
    }
    throw new Error(errorMessage)
  }

  return res.blob()
}
