/**
 * Deletes an existing JATOS study (API route wrapper)
 */
export default async function deleteExistingJatosStudy(id: string) {
  const res = await fetch(`/api/jatos/delete-study?id=${id}`, { method: "DELETE" })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error || "Failed to delete study")
  }
}
