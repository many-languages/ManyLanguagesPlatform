import JSZip from "jszip"

/**
 * Parse a ZIP archive returned by JATOS /results/data endpoint.
 * Accepts Blob, ArrayBuffer, or Node Buffer.
 * Returns an array of { filename, content } objects.
 */
export async function parseJatosZip(rawData: Blob | ArrayBuffer | Buffer) {
  // Normalize input to ArrayBuffer
  let arrayBuffer: ArrayBuffer
  if (rawData instanceof Blob) {
    arrayBuffer = await rawData.arrayBuffer()
  } else if (Buffer.isBuffer(rawData)) {
    arrayBuffer = rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength)
  } else {
    arrayBuffer = rawData
  }

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
