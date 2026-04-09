import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"

const OPERATION = "Upload study"

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

  let response: Response
  try {
    response = await fetch(`${JATOS_BASE}/jatos/api/v1/studies`, {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: formData,
    })
  } catch (cause) {
    throw new JatosTransportError(`Network error during ${OPERATION}`, OPERATION, cause)
  }

  await throwIfJatosError(response, OPERATION)

  const text = await response.text()
  let json: { data?: { id?: number; uuid?: string; title?: string } }
  try {
    json = JSON.parse(text) as {
      data?: { id?: number; uuid?: string; title?: string }
    }
  } catch (cause) {
    throw new JatosTransportError(`Invalid JSON in ${OPERATION} response`, OPERATION, cause)
  }

  const data = json?.data
  if (!data?.uuid || data.id == null) {
    throw new JatosTransportError(`Missing id or uuid in ${OPERATION} response`, OPERATION)
  }

  return { id: data.id, uuid: data.uuid, title: data.title }
}
