import { describe, it, expect } from "vitest"
import { extractJatosStudyUuidFromJzip } from "./extractJatosStudyUuid"
import JSZip from "jszip"

const TEST_UUID = "a1b2c3d4-e5f6-4789-abcd-ef0123456789"

async function createJzipWithJas(uuid: string, jasFilename = "study.jas"): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file(jasFilename, JSON.stringify({ version: 3, data: { uuid } }))
  return zip.generateAsync({ type: "arraybuffer" })
}

describe("extractJatosStudyUuidFromJzip", () => {
  it("extracts UUID from .jas file", async () => {
    const arrayBuffer = await createJzipWithJas(TEST_UUID)

    const result = await extractJatosStudyUuidFromJzip(arrayBuffer)

    expect(result).toBe(TEST_UUID)
  })

  it("extracts UUID from .jas file with different extension case", async () => {
    const zip = new JSZip()
    zip.file("study.JAS", JSON.stringify({ data: { uuid: TEST_UUID } }))
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })

    const result = await extractJatosStudyUuidFromJzip(arrayBuffer)

    expect(result).toBe(TEST_UUID)
  })

  it("returns first valid UUID when multiple .jas files exist", async () => {
    const zip = new JSZip()
    zip.file("first.jas", JSON.stringify({ data: { uuid: "first-uuid" } }))
    zip.file("second.jas", JSON.stringify({ data: { uuid: "second-uuid" } }))
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })

    const result = await extractJatosStudyUuidFromJzip(arrayBuffer)

    expect(result).toBe("first-uuid")
  })

  it("returns null when no .jas file exists", async () => {
    const zip = new JSZip()
    zip.file("other.json", JSON.stringify({ data: { uuid: TEST_UUID } }))
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })

    const result = await extractJatosStudyUuidFromJzip(arrayBuffer)

    expect(result).toBeNull()
  })

  it("returns null when .jas file has no uuid", async () => {
    const zip = new JSZip()
    zip.file("study.jas", JSON.stringify({ data: {} }))
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })

    const result = await extractJatosStudyUuidFromJzip(arrayBuffer)

    expect(result).toBeNull()
  })

  it("skips malformed .jas and continues to next", async () => {
    const zip = new JSZip()
    zip.file("bad.jas", "not valid json")
    zip.file("good.jas", JSON.stringify({ data: { uuid: TEST_UUID } }))
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })

    const result = await extractJatosStudyUuidFromJzip(arrayBuffer)

    expect(result).toBe(TEST_UUID)
  })

  it("works with Blob input", async () => {
    const arrayBuffer = await createJzipWithJas(TEST_UUID)
    const blob = new Blob([arrayBuffer])

    const result = await extractJatosStudyUuidFromJzip(blob)

    expect(result).toBe(TEST_UUID)
  })
})
