import JSZip from "jszip"

/**
 * Parse a ZIP archive returned by JATOS /results/data endpoint.
 * Accepts either a Blob (from fetch) or an ArrayBuffer.
 * Returns an array of { filename, content } objects.
 */
export async function parseJatosZip(rawData: Blob | ArrayBuffer) {
  // Normalize input
  const arrayBuffer = rawData instanceof Blob ? await rawData.arrayBuffer() : rawData

  // Load ZIP into memory
  const zip = await JSZip.loadAsync(arrayBuffer)

  // Extract files asynchronously
  const files: { filename: string; content: string }[] = await Promise.all(
    Object.entries(zip.files)
      .filter(([_, entry]) => !entry.dir)
      .map(async ([filename, entry]) => ({
        filename,
        content: await entry.async("text"),
      }))
  )

  return files
}
