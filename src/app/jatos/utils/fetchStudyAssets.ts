export async function fetchStudyAssets(studyId: number) {
  const res = await fetch(`/api/jatos/get-asset-structure?studyId=${studyId}`)
  const json = await res.json()

  if (!res.ok) throw new Error(json.error || "Failed to fetch study assets")

  // Return the root structure as provided by JATOS
  return json.data
}
