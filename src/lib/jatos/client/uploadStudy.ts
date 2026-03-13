import type { JatosAuth } from "./types"

/**
 * Uploads a JATOS study file (.jzip) to the JATOS server.
 * Low-level transport: POST /jatos/api/v1/studies with FormData.
 * Used by provisioning/importJatosStudy.
 *
 * @param file - The .jzip file to upload
 * @param auth - JATOS auth token (admin token for import)
 * @returns JATOS response with study id, uuid, title
 */
export async function uploadStudy(
  file: File,
  auth: JatosAuth
): Promise<{ id: number; uuid: string; title?: string }> {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  const formData = new FormData()
  formData.append("study", file, file.name)

  const res = await fetch(`${JATOS_BASE}/jatos/api/v1/studies`, {
    method: "POST",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: formData,
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(text || `JATOS upload failed: ${res.status}`)
  }

  const json = JSON.parse(text) as { data?: { id?: number; uuid?: string; title?: string } }
  const data = json.data

  if (!data?.uuid || data.id == null) {
    throw new Error("Missing id or uuid in JATOS response")
  }

  return {
    id: data.id,
    uuid: data.uuid,
    title: data.title,
  }
}
