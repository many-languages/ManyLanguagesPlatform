import { describe, it, expect } from "vitest"
import JSZip from "jszip"
import { rewriteJatosStudyUuidInJzip } from "./rewriteJatosStudyUuid"
import { extractJatosStudyUuidFromJzip } from "./extractJatosStudyUuid"

const OLD_UUID = "a1b2c3d4-e5f6-4789-abcd-ef0123456789"
const NEW_UUID = "11111111-2222-4333-8444-555555555555"

async function createJzipWithJas(
  uuid: string,
  jasFilename = "study.jas",
  extraFiles: Record<string, string> = {}
): Promise<File> {
  const zip = new JSZip()
  zip.file(jasFilename, JSON.stringify({ version: 3, data: { uuid, title: "Example" } }))
  for (const [name, content] of Object.entries(extraFiles)) {
    zip.file(name, content)
  }
  const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })
  return new File([arrayBuffer], "study.jzip", { type: "application/zip" })
}

describe("rewriteJatosStudyUuidInJzip", () => {
  it("replaces the UUID in the .jas file", async () => {
    const file = await createJzipWithJas(OLD_UUID)

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const result = await extractJatosStudyUuidFromJzip(rewritten)

    expect(result).toBe(NEW_UUID)
  })

  it("preserves the original filename", async () => {
    const file = await createJzipWithJas(OLD_UUID)

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)

    expect(rewritten.name).toBe(file.name)
  })

  it("leaves other fields in the .jas file untouched", async () => {
    const file = await createJzipWithJas(OLD_UUID)

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const arrayBuffer = await rewritten.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const jasContent = await zip.file("study.jas")!.async("text")
    const parsed = JSON.parse(jasContent)

    expect(parsed.data.title).toBe("Example")
    expect(parsed.version).toBe(3)
  })

  it("leaves non-.jas files untouched", async () => {
    const file = await createJzipWithJas(OLD_UUID, "study.jas", {
      "assets/script.js": "console.log('hello')",
    })

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const arrayBuffer = await rewritten.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const assetContent = await zip.file("assets/script.js")!.async("text")

    expect(assetContent).toBe("console.log('hello')")
  })

  it("updates every .jas file when multiple exist", async () => {
    const zip = new JSZip()
    zip.file("first.jas", JSON.stringify({ data: { uuid: OLD_UUID } }))
    zip.file("second.jas", JSON.stringify({ data: { uuid: "some-other-uuid" } }))
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })
    const file = new File([arrayBuffer], "study.jzip", { type: "application/zip" })

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const rewrittenArrayBuffer = await rewritten.arrayBuffer()
    const rewrittenZip = await JSZip.loadAsync(rewrittenArrayBuffer)
    const first = JSON.parse(await rewrittenZip.file("first.jas")!.async("text"))
    const second = JSON.parse(await rewrittenZip.file("second.jas")!.async("text"))

    expect(first.data.uuid).toBe(NEW_UUID)
    expect(second.data.uuid).toBe(NEW_UUID)
  })

  it("skips malformed .jas entries without throwing", async () => {
    const zip = new JSZip()
    zip.file("bad.jas", "not valid json")
    zip.file("good.jas", JSON.stringify({ data: { uuid: OLD_UUID } }))
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })
    const file = new File([arrayBuffer], "study.jzip", { type: "application/zip" })

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const rewrittenArrayBuffer = await rewritten.arrayBuffer()
    const rewrittenZip = await JSZip.loadAsync(rewrittenArrayBuffer)
    const bad = await rewrittenZip.file("bad.jas")!.async("text")
    const good = JSON.parse(await rewrittenZip.file("good.jas")!.async("text"))

    expect(bad).toBe("not valid json")
    expect(good.data.uuid).toBe(NEW_UUID)
  })
})
