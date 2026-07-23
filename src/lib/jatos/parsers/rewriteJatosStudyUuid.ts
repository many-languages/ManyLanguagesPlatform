import JSZip from "jszip"

type JatosStudyMetadata = {
  version?: string | number
  data?: {
    uuid?: string
    [key: string]: unknown
  }
}

/**
 * Rewrites the JATOS study UUID inside every .jas file of a .jzip archive,
 * returning a new File with the same name but updated contents.
 * Used to mint a fresh, non-colliding UUID for a shared example template.
 */
export async function rewriteJatosStudyUuidInJzip(file: File, newUuid: string): Promise<File> {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)

  const jasEntries = Object.entries(zip.files)
    .filter(([_, entry]) => !entry.dir)
    .filter(([name]) => name.toLowerCase().endsWith(".jas"))

  for (const [name, entry] of jasEntries) {
    try {
      const content = await entry.async("text")
      const parsed = JSON.parse(content) as JatosStudyMetadata
      if (typeof parsed?.data?.uuid === "string" && parsed.data.uuid.length > 0) {
        parsed.data.uuid = newUuid
        zip.file(name, JSON.stringify(parsed))
      }
    } catch {
      // Ignore malformed .jas entries and leave them untouched
    }
  }

  const blob = await zip.generateAsync({ type: "blob" })
  return new File([blob], file.name, { type: file.type })
}
