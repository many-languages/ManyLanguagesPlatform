import JSZip from "jszip"

type JatosUuidEntry = {
  uuid?: string
  [key: string]: unknown
}

type JatosStudyMetadata = {
  version?: string | number
  data?: {
    uuid?: string
    componentList?: JatosUuidEntry[]
    batchList?: JatosUuidEntry[]
    [key: string]: unknown
  }
}

function regenerateEntryUuids(entries: JatosUuidEntry[] | undefined): void {
  for (const entry of entries ?? []) {
    if (typeof entry.uuid === "string" && entry.uuid.length > 0) {
      entry.uuid = crypto.randomUUID()
    }
  }
}

/**
 * Rewrites the JATOS study UUID inside every .jas file of a .jzip archive,
 * returning a new File with the same name but updated contents.
 * Used to mint a fresh, non-colliding UUID for a shared example template.
 *
 * JATOS enforces UUID uniqueness on components and batches as well as
 * studies (a duplicate component/batch UUID fails the upload even when the
 * study UUID itself is unique), so those are regenerated too, not just the
 * study's UUID.
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
        regenerateEntryUuids(parsed.data.componentList)
        regenerateEntryUuids(parsed.data.batchList)
        zip.file(name, JSON.stringify(parsed))
      }
    } catch {
      // Ignore malformed .jas entries and leave them untouched
    }
  }

  const blob = await zip.generateAsync({ type: "blob" })
  return new File([blob], file.name, { type: file.type })
}
