/**
 * Deletes an existing JATOS study (API route wrapper)
 */
export default async function deleteExistingJatosStudy(id: string, options?: { token?: string }) {
  const headers: HeadersInit = {}
  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`
  }
  const res = await fetch(`/api/jatos/delete-study?id=${id}`, {
    method: "DELETE",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error || "Failed to delete study")
  }
}
