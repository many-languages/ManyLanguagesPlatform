export async function fetchStudyAssets(studyId: number, options?: { token?: string }) {
  const headers: HeadersInit = {}
  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`
  }
  const res = await fetch(`/api/jatos/get-asset-structure?studyId=${studyId}`, {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  })
  const json = await res.json()

  if (!res.ok) throw new Error(json.error || "Failed to fetch study assets")

  // Return the root structure as provided by JATOS
  return json.data
}
