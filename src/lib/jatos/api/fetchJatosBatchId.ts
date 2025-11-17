/**
 * Utility: fetch JATOS study properties and return first batchId
 */
export default async function fetchJatosBatchId(uuid: string) {
  const res = await fetch(`/api/jatos/get-study-properties?studyId=${uuid}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Failed to fetch JATOS properties")

  const batches = json?.batches ?? []
  const batchId = batches.length > 0 ? batches[0].id : null

  return batchId
}
