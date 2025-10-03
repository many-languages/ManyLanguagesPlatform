import FormData from "form-data"
import { jatosFetch } from "./client"

export async function importStudyJzip(buffer: Buffer, filename: string) {
  const form = new FormData()
  form.append("study", buffer, { filename })

  const res = await jatosFetch("/jatos/api/v1/study", {
    method: "POST",
    body: form as any,
  })
  return res.json() as Promise<{ id: number; uuid: string }>
}
