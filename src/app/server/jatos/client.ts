const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

export async function jatosFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${JATOS_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${JATOS_TOKEN}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    throw new Error(`JATOS API error ${res.status}: ${await res.text()}`)
  }
  return res
}
