/**
 * Utility: fetch JATOS study properties and return first batchId
 */
export default async function fetchJatosBatchId(uuid: string) {
  const res = await fetch(`/api/jatos/get-study-properties?studyId=${uuid}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Failed to fetch JATOS properties")

  // Add debugging
  console.log("🔍 fetchJatosBatchId - Full response:", JSON.stringify(json, null, 2))
  console.log("🔍 fetchJatosBatchId - Looking for batches in:", json?.batches)

  const batches = json?.batches ?? []
  console.log("🔍 fetchJatosBatchId - Found batches:", batches)

  const batchId = batches.length > 0 ? batches[0].id : null
  console.log("🔍 fetchJatosBatchId - Returning batchId:", batchId)

  return batchId
}
