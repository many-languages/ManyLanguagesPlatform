import JSZip from "jszip"

type JatosStudyMetadata = {
  version?: string | number
  data?: {
    uuid?: string
  }
}

/**
 * Extracts the JATOS study UUID from a .jzip archive.
 * Looks for a .jas file (name not standardized) and parses JSON metadata.
 */
export async function extractJatosStudyUuidFromJzip(
  rawData: Blob | ArrayBuffer
): Promise<string | null> {
  const arrayBuffer = rawData instanceof Blob ? await rawData.arrayBuffer() : rawData
  const zip = await JSZip.loadAsync(arrayBuffer)

  const jasEntries = Object.entries(zip.files)
    .filter(([_, entry]) => !entry.dir)
    .filter(([name]) => name.toLowerCase().endsWith(".jas"))

  for (const [_, entry] of jasEntries) {
    try {
      const content = await entry.async("text")
      const parsed = JSON.parse(content) as JatosStudyMetadata
      const uuid = parsed?.data?.uuid
      if (typeof uuid === "string" && uuid.length > 0) return uuid
    } catch {
      // Ignore malformed .jas entries and keep searching
    }
  }

  return null
}
